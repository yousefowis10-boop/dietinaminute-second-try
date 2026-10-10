"""Dietitians adding foods (from a label photo or typed in), admin approval, and company (team) accounts."""
import secrets

from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from authapp.models import Clinic

from . import ai
from .models import FoodItem
from .serializers import FoodItemSerializer
from .views_v2 import _ai_error
from .views_v4 import _decode_files

User = get_user_model()


def _num(v):
    try:
        return max(float(v), 0)
    except (TypeError, ValueError):
        return None


class FoodLabelReadView(APIView):
    """Read a product's nutrition label from 1-4 photos (AI). Nothing is saved here."""

    def post(self, request):
        try:
            ai.check_allowed(request.user)
            files = _decode_files(request.data)[:4]
            if not files:
                return Response({'detail': 'file_required'}, status=400)
            return Response(ai.read_food_label([(f[0], f[1]) for f in files]))
        except ai.AIUnavailable as exc:
            return _ai_error(exc)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=400)


class FoodAddView(APIView):
    """Add a food. from_label=true (read from a label photo, brand required) goes straight into the main list;
    typed by hand it is private to the dietitian's company until an admin approves it."""

    def post(self, request):
        d = request.data
        name, brand = (d.get('name') or '').strip(), (d.get('brand') or '').strip()
        from_label = bool(d.get('from_label'))
        serving = _num(d.get('serving'))
        macros = {k: _num(d.get(k)) for k in ('protein', 'carb', 'fat')}
        errors = {}
        if not name:
            errors['name'] = 'required'
        if from_label and not brand:
            errors['brand'] = 'required'
        if not serving:
            errors['serving'] = 'required'
        if any(v is None for v in macros.values()):
            errors['macros'] = 'required'
        if errors:
            return Response(errors, status=400)
        full = (f'{brand} – {name}' if brand else name)[:100]
        if FoodItem.objects.filter(name__iexact=full).exists():
            return Response({'name': 'exists'}, status=400)
        unit = 'ml' if d.get('unit') == 'ml' else 'g'
        kc = {'protein': macros['protein'] * 4, 'carb': macros['carb'] * 4, 'fat': macros['fat'] * 9}
        name_ar = (d.get('name_ar') or '').strip()
        food = FoodItem.objects.create(
            name=full, name_ar=(f'{brand} – {name_ar}' if brand and name_ar else name_ar or full)[:100],
            unit=unit, unit_ar='مل' if unit == 'ml' else 'غرام',
            multiplying_factor=serving, food_type=max(kc, key=kc.get), brand=brand[:100], added_by=request.user,
            source='label_photo' if from_label else 'manual', is_public=from_label,
            review_status='' if from_label else 'pending', **macros)
        return Response(FoodItemSerializer(food).data, status=201)


class FoodReviewView(APIView):
    """Admin (staff) only: foods typed in by dietitians that wait for approval; approve or reject."""

    def get(self, request):
        if not request.user.is_staff:
            return Response({'detail': 'forbidden'}, status=403)
        foods = FoodItem.objects.filter(review_status='pending').select_related('added_by').order_by('id')
        return Response([{**FoodItemSerializer(f).data,
                          'added_by_name': (f.added_by.get_full_name() or f.added_by.username) if f.added_by else ''} for f in foods])

    def post(self, request, food_id):
        if not request.user.is_staff:
            return Response({'detail': 'forbidden'}, status=403)
        food = get_object_or_404(FoodItem, id=food_id, review_status='pending')
        approve = bool(request.data.get('approve'))
        food.review_status = 'approved' if approve else 'rejected'
        food.is_public = approve
        food.save(update_fields=['review_status', 'is_public'])
        return Response({'ok': True})


def _member(u):
    return {'id': u.id, 'name': u.get_full_name() or u.first_name or u.username, 'email': u.username,
            'is_admin': u.is_clinic_admin, 'active': u.is_active}


class TeamView(APIView):
    """Solo (freelancer) or company account. The company admin adds and removes dietitians."""

    def get(self, request):
        u = request.user
        if not u.clinic_id:
            return Response({'mode': 'solo'})
        members = User.objects.filter(clinic_id=u.clinic_id).order_by('-is_clinic_admin', 'first_name')
        return Response({'mode': 'company', 'name': u.clinic.name, 'is_admin': u.is_clinic_admin,
                         'share_clients': u.clinic.share_clients, 'members': [_member(m) for m in members]})

    @transaction.atomic
    def post(self, request):
        """A solo dietitian turns the account into a company and becomes its admin."""
        u = request.user
        if u.clinic_id:
            return Response({'detail': 'already_company'}, status=400)
        name = (request.data.get('name') or '').strip()[:200]
        if not name:
            return Response({'name': 'required'}, status=400)
        u.clinic = Clinic.objects.create(name=name)
        u.is_clinic_admin = True
        u.save(update_fields=['clinic', 'is_clinic_admin'])
        return self.get(request)

    def put(self, request):
        """Admin: company name and whether dietitians share clients."""
        u = request.user
        if not (u.clinic_id and u.is_clinic_admin):
            return Response({'detail': 'forbidden'}, status=403)
        c = u.clinic
        if (request.data.get('name') or '').strip():
            c.name = request.data['name'].strip()[:200]
        if 'share_clients' in request.data:
            c.share_clients = bool(request.data['share_clients'])
        c.save()
        return self.get(request)


class TeamMemberView(APIView):
    """Admin adds a dietitian (gets a one-time password to pass on) or switches one off / back on."""

    def post(self, request):
        admin = request.user
        if not (admin.clinic_id and admin.is_clinic_admin):
            return Response({'detail': 'forbidden'}, status=403)
        email = (request.data.get('email') or '').strip().lower()
        first = (request.data.get('name') or '').strip()[:150]
        if '@' not in email or not first:
            return Response({'detail': 'name_email_required'}, status=400)
        if User.objects.filter(username__iexact=email).exists():
            return Response({'email': 'exists'}, status=400)
        password = secrets.token_urlsafe(9)
        member = User.objects.create_user(username=email, email=email, password=password, first_name=first,
                                          clinic_id=admin.clinic_id, plan_tier=admin.plan_tier, is_subscribed=admin.is_subscribed)
        return Response({'member': _member(member), 'password': password}, status=201)

    def put(self, request, member_id):
        admin = request.user
        if not (admin.clinic_id and admin.is_clinic_admin):
            return Response({'detail': 'forbidden'}, status=403)
        m = get_object_or_404(User, id=member_id, clinic_id=admin.clinic_id)
        if m.id == admin.id:
            return Response({'detail': 'not_yourself'}, status=400)
        if 'active' in request.data:
            m.is_active = bool(request.data['active'])
        if 'is_admin' in request.data:
            m.is_clinic_admin = bool(request.data['is_admin'])
        m.save(update_fields=['is_active', 'is_clinic_admin'])
        return Response(_member(m))
