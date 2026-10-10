"""Endpoints added in the upgrade (phases 1-3)."""
import base64
import io
from datetime import datetime, timedelta

from django.db import transaction
from django.db.models import Q
from django.forms.models import model_to_dict
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import ai
from .models import (
    AIResult, CheckInFile, CheckInLink, ClientProfile, ClientProfileRevision, DetailedProfile, DetailedProfileRevision,
    DietItem, DietPlan, FoodItem, InterviewInvite, PlanTemplate, Tag, UserProfile, WorkoutTemplate,
)
from .serializers import (
    AIResultSerializer, ClientProfileSerializer, DetailedProfileSerializer, PlanTemplateSerializer,
    WorkoutTemplateSerializer,
)
from .services import (
    calculate_targets, clean_meal_slots, client_qs, common_foods, describe_week, ensure_tags, follow_up_due,
    plan_qs, plan_recipes, progress_change, allergies_of, allergy_food_ids, visible_foods, safety_flags, smart_grocery, split_plan, sync_never_foods, team_user_ids, weekly_plan,
)

# Questions a client may answer through the public link. Admin fields are not included.
PUBLIC_INTERVIEW_FIELDS = {
    'email', 'marital_status', 'occupation', 'symptoms', 'food_allergies', 'diseases', 'allergy_notes', 'protein',
    'fat', 'carbs', 'grains', 'vegetables', 'fruit', 'dairy', 'food_to_eat_more', 'food_to_eat_less',
    'food_to_avoid', 'current_supplement_intake', 'current_medications', 'medicine_history', 'surgical_history',
    'lifestyle_goal', 'dietary_goal', 'fitness_goal', 'additional_concerns', 'smoke_cigarettes',
    'how_many_smoke_a_day', 'smoking_duration', 'alcohol', 'how_many_drinks_a_day', 'alcohol_duration', 'caffeine',
    'how_many_caffeine_a_day', 'caffeine_duration', 'exercise', 'exercise_duration', 'exercise_times_per_week',
    'workout_intensity', 'types_of_workout', 'exercise_place', 'exercise_level', 'willing_gym', 'willing_home', 'sleep_time', 'sleep_duration', 'bowel_movements_per_day',
    'urinate_frequency', 'overall_energy_levels', 'pregnant', 'weeks_pregnant', 'due_date', 'breastfeeding',
    'women_health_comments', 'liked_foods', 'less_foods', 'never_foods', 'drinks',
}


def _profile(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


def _ai_error(exc):
    messages = {
        'upgrade_required': 'AI features are part of the Pro plan.',
        'disabled_by_user': 'AI is switched off in Settings.',
        'not_configured': 'AI is not set up on this server yet.',
        'missing_targets': 'Set the client\'s calorie targets first.',
        'provider_error': 'The AI service did not respond. Try again in a minute.',
        'bad_response': 'The AI answer could not be used. Try again.',
    }
    code = str(exc)
    return Response({'error': code, 'detail': messages.get(code, code)},
                    status=status.HTTP_402_PAYMENT_REQUIRED if code == 'upgrade_required' else status.HTTP_409_CONFLICT)


def _lang(request):
    return 'en' if request.data.get('language', request.query_params.get('language')) == 'en' else 'ar'


# ------------------------------------------------------------ account ---

class AccountView(APIView):
    """Who is logged in, their plan level and what they can use."""

    def get(self, request):
        user = request.user
        profile = _profile(user)
        return Response({
            'username': user.username,
            'first_name': user.first_name,
            'is_subscribed': user.is_subscribed,
            'plan_tier': user.plan_tier,
            'clinic': {'id': user.clinic_id, 'name': user.clinic.name} if user.clinic_id else None,
            'is_clinic_admin': user.is_clinic_admin,
            'is_staff': user.is_staff,
            'ai': {
                'plan_allows': user.has_ai_plan,
                'enabled': profile.ai_enabled,
                'server_ready': ai.is_configured(),
                'test_mode': ai.is_fake(),
            },
            'clinic_name': profile.clinic_name or (user.clinic.name if user.clinic_id else ''),
            'logo_url': profile.logo_data or (profile.logo.url if profile.logo else None),
        })


class BrandingView(APIView):
    """Logo (stored in the database), clinic name, AI on/off."""

    def put(self, request):
        profile = _profile(request.user)
        if 'clinic_name' in request.data:
            profile.clinic_name = (request.data.get('clinic_name') or '')[:200]
        if 'ai_enabled' in request.data:
            profile.ai_enabled = str(request.data.get('ai_enabled')).lower() in ('true', '1', 'yes')
        upload = request.FILES.get('logo')
        if upload:
            try:
                from PIL import Image
                image = Image.open(upload)
                image.thumbnail((400, 400))
                buffer = io.BytesIO()
                image.convert('RGBA').save(buffer, format='PNG', optimize=True)
            except Exception:
                return Response({'detail': 'This file is not an image we can read.'}, status=400)
            profile.logo_data = 'data:image/png;base64,' + base64.b64encode(buffer.getvalue()).decode()
        if request.data.get('remove_logo') in ('true', True):
            profile.logo_data = ''
            profile.logo = None
        profile.save()
        return AccountView().get(request)


# ----------------------------------------------------------- dashboard ---

class DashboardView(APIView):
    def get(self, request):
        clients = client_qs(request.user)
        now = timezone.now()
        due = []
        for client in clients.order_by('name'):
            is_due, last = follow_up_due(client)
            if is_due:
                due.append({'id': client.id, 'name': client.name, 'last_visit': last})
        waiting = clients.filter(interview_status='submitted').values('id', 'name')
        recent = plan_qs(request.user).select_related('client').order_by('-created_at')[:6]
        new_checkins = (ClientProfileRevision.objects.filter(client__in=clients, reviewed=False)
                        .select_related('client').order_by('-created_at'))
        return Response({
            'counts': {
                'clients': clients.count(),
                'plans_this_month': plan_qs(request.user).filter(created_at__gte=now - timedelta(days=30)).count(),
                'interviews_waiting': waiting.count(),
                'follow_ups_due': len(due),
                'checkins_waiting': new_checkins.count(),
            },
            'checkins_waiting': [{'id': r.id, 'client_id': r.client_id, 'name': r.client.name, 'date': r.created_at,
                                  'weight': r.weight} for r in new_checkins[:8]],
            'follow_ups_due': sorted(due, key=lambda d: d['last_visit'])[:8],
            'interviews_waiting': list(waiting),
            'recent_plans': [{'id': p.id, 'name': p.name, 'client_id': p.client_id, 'client': p.client.name,
                              'created_at': p.created_at} for p in recent],
        })


# ------------------------------------------------------------- targets ---

class CalcTargetsView(APIView):
    """Preview calories and macros while the dietitian types (nothing is saved)."""

    def post(self, request):
        d = request.data
        try:
            return Response(calculate_targets(
                formula_name=d.get('formula'), gender=d.get('gender'), weight=float(d.get('weight')),
                height=float(d.get('height')), age=float(d.get('age')), work_style=d.get('work_style'),
                adjustment=float(d.get('adjustment') or 0), protein_pct=float(d.get('protein_pct', 25)),
                carb_pct=float(d.get('carb_pct', 55)), fat_pct=float(d.get('fat_pct', 20))))
        except (TypeError, ValueError) as exc:
            return Response({'detail': str(exc)}, status=400)


# ------------------------------------------------------ client extras ---

class ClientOverviewView(APIView):
    """Everything the client page needs in one call."""

    def get(self, request, client_id):
        client = get_object_or_404(client_qs(request.user), id=client_id)
        detailed = DetailedProfile.objects.filter(client=client).first()
        plans = plan_qs(request.user).filter(client=client).order_by('-created_at')
        revisions = client.profile_revisions.order_by('created_at')
        is_due, last = follow_up_due(client)
        invite = client.interview_invites.order_by('-created_at').first()
        return Response({
            'client': ClientProfileSerializer(client).data,
            'excluded_foods': list(client.excluded_foods.values('id', 'name', 'name_ar')),
            'allergies': allergies_of(client),
            'allergy_mode': client.allergy_mode,
            'allergy_food_ids': sorted(allergy_food_ids(client, visible_foods(request.user).select_related('recipe'))),
            'interview': {
                'status': client.interview_status,
                'token': str(invite.token) if invite else None,
                'submitted_at': invite.submitted_at if invite else None,
                'answered_fields': sum(1 for f in PUBLIC_INTERVIEW_FIELDS
                                       if detailed and getattr(detailed, f, None) not in (None, '', [], {})),
            },
            'safety_flags': safety_flags(client, detailed),
            'visits': revisions.count(),
            'last_visit': last,
            'follow_up_due': is_due,
            'plans': [{'id': p.id, 'name': p.name, 'created_at': p.created_at, 'total_protein': p.total_protein,
                       'total_carb': p.total_carb, 'total_fat': p.total_fat,
                       'kcal': round(p.total_protein * 4 + p.total_carb * 4 + p.total_fat * 9)} for p in plans],
            'progress': [checkin_json(r) for r in revisions.select_related('file')],
            'progress_change': progress_change(client),
            'ai_results': AIResultSerializer(client.ai_results.order_by('-created_at')[:5], many=True).data,
        })


class ClientExclusionsView(APIView):
    """Foods this client must never get. Enforced when plans are saved."""

    def put(self, request, client_id):
        client = get_object_or_404(client_qs(request.user), id=client_id)
        ids = [int(i) for i in request.data.get('food_ids', []) if str(i).isdigit()]
        client.excluded_foods.set(FoodItem.objects.filter(id__in=ids))
        return Response({'excluded_foods': list(client.excluded_foods.values('id', 'name', 'name_ar'))})


class InterviewLinkView(APIView):
    """Create (or reuse) the client's private interview link."""

    def post(self, request, client_id):
        client = get_object_or_404(client_qs(request.user), id=client_id)
        invite = client.interview_invites.filter(submitted_at__isnull=True).order_by('-created_at').first()
        if invite is None or request.data.get('new'):
            invite = InterviewInvite.objects.create(client=client)
        if client.interview_status in ('none', 'reviewed'):
            client.interview_status = 'sent'
            # .update() skips ClientProfile.save(), which would also rewrite the interview profile.
            ClientProfile.objects.filter(pk=client.pk).update(interview_status='sent')
        return Response({'token': str(invite.token), 'status': client.interview_status})


class InterviewReviewedView(APIView):
    def post(self, request, client_id):
        client = get_object_or_404(client_qs(request.user), id=client_id)
        client.interview_status = 'reviewed'
        # .update() skips ClientProfile.save(), which would also rewrite the interview profile.
        ClientProfile.objects.filter(pk=client.pk).update(interview_status='reviewed')
        return Response({'status': 'reviewed'})


class PublicInterviewView(APIView):
    """Opened by the client from the link. No login; the long random token is the key."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def _invite(self, token):
        return get_object_or_404(InterviewInvite.objects.select_related('client', 'client__user'), token=token)

    def get(self, request, token):
        invite = self._invite(token)
        owner = invite.client.user
        profile = UserProfile.objects.filter(user=owner).first()
        return Response({
            'first_name': (invite.client.name or '').split(' ')[0],
            'gender': invite.client.gender,
            'clinic_name': (profile.clinic_name if profile else '') or (owner.clinic.name if owner.clinic_id else ''),
            'logo_url': profile.logo_data if profile and profile.logo_data else None,
            'submitted': invite.submitted_at is not None,
            'foods': list(FoodItem.objects.filter(is_public=True).exclude(recipe__has_pork=True).order_by('food_type', 'name').values('id', 'name', 'name_ar', 'food_type')),
        })

    @transaction.atomic
    def post(self, request, token):
        invite = self._invite(token)
        if invite.submitted_at is not None:
            return Response({'detail': 'already_submitted'}, status=409)
        answers = {k: v for k, v in (request.data.get('answers') or {}).items() if k in PUBLIC_INTERVIEW_FIELDS}
        client = invite.client
        detailed, created = DetailedProfile.objects.get_or_create(client=client, defaults={'user': client.user})
        serializer = DetailedProfileSerializer(detailed, data=answers, partial=True)
        if not serializer.is_valid():
            return Response({'detail': 'invalid', 'errors': serializer.errors}, status=400)
        detailed = serializer.save()
        sync_never_foods(client, detailed)
        DetailedProfileRevision.objects.create(
            detailed_profile=detailed, user=client.user, client=client, revision_reason='Answered by client via link',
            **model_to_dict(detailed, exclude=['id', 'user', 'client']))
        invite.answers = answers
        invite.submitted_at = timezone.now()
        invite.save()
        client.interview_status = 'submitted'
        # .update() skips ClientProfile.save(), which would also rewrite the interview profile.
        ClientProfile.objects.filter(pk=client.pk).update(interview_status='submitted')
        return Response({'ok': True})


# ---------------------------------------------------------- plan extras ---

class PlanSheetView(APIView):
    """The client's sheet: meals, grocery list, workout, branding."""

    def get(self, request, plan_id):
        plan = get_object_or_404(plan_qs(request.user).select_related('client', 'workout'), id=plan_id)
        split, unassigned = split_plan(plan)
        account = AccountView().get(request).data
        return Response({
            'plan': {'id': plan.id, 'name': plan.name, 'created_at': plan.created_at, 'notes': plan.notes,
                     'kcal': round(plan.total_protein * 4 + plan.total_carb * 4 + plan.total_fat * 9),
                     'protein': round(plan.total_protein), 'carb': round(plan.total_carb), 'fat': round(plan.total_fat)},
            'client': {'id': plan.client.id, 'name': plan.client.name, 'goal': plan.client.goal, 'phone': plan.client.phone},
            'meals': split,
            'meal_slots': plan.meal_slots or [],
            'weekly': describe_week(plan.weekly),
            'unassigned': unassigned,
            'grocery': smart_grocery(plan),
            'grocery2': smart_grocery(plan, weeks=2),
            'grocery4': smart_grocery(plan, weeks=4),
            'recipes': plan_recipes(plan),
            'workout': WorkoutTemplateSerializer(plan.workout).data if plan.workout else None,
            'branding': {'clinic_name': account['clinic_name'], 'logo_url': account['logo_url']},
        })


class PlanWorkoutView(APIView):
    def put(self, request, plan_id):
        plan = get_object_or_404(plan_qs(request.user), id=plan_id)
        workout_id = request.data.get('workout_id')
        if workout_id:
            plan.workout = get_object_or_404(_workouts_for(request.user), id=workout_id)
        else:
            plan.workout = None
        plan.save(update_fields=['workout'])
        return Response({'workout': plan.workout_id})


class PlanNotesView(APIView):
    def put(self, request, plan_id):
        plan = get_object_or_404(plan_qs(request.user), id=plan_id)
        plan.notes = (request.data.get('notes') or '')[:5000]
        if request.data.get('name'):
            plan.name = request.data['name'][:255]
        plan.save(update_fields=['notes', 'name'])
        return Response({'ok': True})


class PlanDeleteView(APIView):
    def delete(self, request, plan_id):
        plan = get_object_or_404(plan_qs(request.user), id=plan_id)
        plan.delete()
        return Response(status=204)


# ------------------------------------------------------------ templates ---

def _templates_for(user):
    return PlanTemplate.objects.filter(Q(user__isnull=True) | Q(user_id__in=team_user_ids(user)))


def _workouts_for(user):
    return WorkoutTemplate.objects.filter(Q(user__isnull=True) | Q(user_id__in=team_user_ids(user)))


class PlanTemplateListView(APIView):
    def get(self, request):
        qs = _templates_for(request.user).order_by('-is_medical', 'name')
        return Response(PlanTemplateSerializer(qs, many=True).data)

    def post(self, request):
        """Save an existing plan as a template: {"plan_id": 5, "name": "..."}."""
        plan = get_object_or_404(plan_qs(request.user), id=request.data.get('plan_id'))
        items = []
        for item in plan.items.select_related('food').prefetch_related('tags'):
            tags = list(item.tags.all())
            items.append({
                'food_id': item.food_id, 'quantity': item.quantity, 'category': item.category,
                'meals': [t.name for t in tags],
                'shares': {t.name: float((item.meal_shares or {}).get(str(t.id), 0)) for t in tags} if item.meal_shares else {},
            })
        template = PlanTemplate.objects.create(
            user=request.user, name=(request.data.get('name') or plan.name)[:200],
            description=request.data.get('description', ''), items=items)
        return Response(PlanTemplateSerializer(template).data, status=201)


class PlanTemplateDetailView(APIView):
    def delete(self, request, template_id):
        template = get_object_or_404(PlanTemplate, id=template_id, user=request.user)
        template.delete()
        return Response(status=204)


class ApplyTemplateView(APIView):
    """Returns the template's foods ready for the builder, minus the client's excluded foods."""

    def get(self, request, template_id, client_id):
        template = get_object_or_404(_templates_for(request.user), id=template_id)
        client = get_object_or_404(client_qs(request.user), id=client_id)
        excluded = set(client.excluded_foods.values_list('id', flat=True))
        foods = {f.id: f for f in FoodItem.objects.filter(id__in=[i['food_id'] for i in template.items])}
        items, removed = [], []
        for entry in template.items:
            food = foods.get(entry.get('food_id'))
            if food is None:
                continue
            if food.id in excluded:
                removed.append(food.name_ar or food.name)
                continue
            items.append({**entry, 'name': food.name, 'name_ar': food.name_ar, 'unit': food.unit,
                          'unit_ar': food.unit_ar, 'protein': food.protein, 'carb': food.carb, 'fat': food.fat,
                          'food_type': food.food_type, 'multiplying_factor': food.multiplying_factor})
        return Response({'template': PlanTemplateSerializer(template).data, 'items': items, 'removed': removed})


# ------------------------------------------------------------- workouts ---

class WorkoutListView(APIView):
    def get(self, request):
        qs = _workouts_for(request.user)
        for field in ('goal', 'level', 'place'):
            if request.query_params.get(field):
                qs = qs.filter(**{field: request.query_params[field]})
        return Response(WorkoutTemplateSerializer(qs.order_by('goal', 'level', 'place'), many=True).data)

    def post(self, request):
        serializer = WorkoutTemplateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=201)


class WorkoutDetailView(APIView):
    def put(self, request, workout_id):
        workout = get_object_or_404(WorkoutTemplate, id=workout_id, user=request.user)
        serializer = WorkoutTemplateSerializer(workout, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, workout_id):
        get_object_or_404(WorkoutTemplate, id=workout_id, user=request.user).delete()
        return Response(status=204)


# ------------------------------------------------------------------ AI ---

class AISummaryView(APIView):
    def post(self, request, client_id):
        client = get_object_or_404(client_qs(request.user), id=client_id)
        try:
            ai.check_allowed(request.user)
            content = ai.interview_summary(client, _lang(request))
        except ai.AIUnavailable as exc:
            return _ai_error(exc)
        result = AIResult.objects.create(client=client, kind='summary', content=content)
        return Response(AIResultSerializer(result).data)


class AIDraftPlanView(APIView):
    def post(self, request, client_id):
        client = get_object_or_404(client_qs(request.user), id=client_id)
        try:
            ai.check_allowed(request.user)
            return Response(ai.draft_plan(client, request.data.get('meals', 4), _lang(request)))
        except ai.AIUnavailable as exc:
            return _ai_error(exc)


class AIClientMessageView(APIView):
    def post(self, request, plan_id):
        plan = get_object_or_404(plan_qs(request.user).select_related('client', 'workout'), id=plan_id)
        try:
            ai.check_allowed(request.user)
            split, _ = split_plan(plan)
            content = ai.client_message(plan, split, _lang(request))
        except ai.AIUnavailable as exc:
            return _ai_error(exc)
        result = AIResult.objects.create(client=plan.client, plan=plan, kind='message', content=content)
        return Response(AIResultSerializer(result).data)


class AIFollowUpView(APIView):
    def post(self, request, client_id):
        client = get_object_or_404(client_qs(request.user), id=client_id)
        change = progress_change(client)
        if change is None:
            return Response({'error': 'need_two_visits', 'detail': 'Needs at least two visits to compare.'}, status=409)
        try:
            ai.check_allowed(request.user)
            content = {**ai.follow_up(client, change, _lang(request)), 'change': change}
        except ai.AIUnavailable as exc:
            return _ai_error(exc)
        result = AIResult.objects.create(client=client, kind='followup', content=content)
        return Response(AIResultSerializer(result).data)


class FitServingsView(APIView):
    """Adjust servings of the chosen foods so the plan lands on the client's targets.

    Used by the builder's "fit to targets" button and after loading a template.
    """

    def post(self, request, client_id):
        from .services import fit_servings, totals_for, within
        client = get_object_or_404(client_qs(request.user), id=client_id)
        targets = {'protein': client.target_protein or 0, 'carb': client.target_carb or 0, 'fat': client.target_fat or 0}
        raw = request.data.get('items') or []
        ids = [int(i['food_id']) for i in raw if str(i.get('food_id', '')).isdigit()]
        foods_by_id = {f.id: f for f in FoodItem.objects.filter(id__in=ids)}
        items = [{'food_id': int(i['food_id']), 'quantity': max(float(i.get('quantity') or 1), 0.5)}
                 for i in raw if str(i.get('food_id', '')).isdigit() and int(i['food_id']) in foods_by_id]
        locked = {int(i) for i in request.data.get('locked', []) if str(i).isdigit()}
        free = [i for i in items if i['food_id'] not in locked]
        fixed = [i for i in items if i['food_id'] in locked]
        fixed_totals = totals_for(fixed, foods_by_id) if fixed else {'protein': 0, 'carb': 0, 'fat': 0}
        remaining = {m: max(targets[m] - fixed_totals[m], 0) for m in targets}
        fitted = fit_servings(free, foods_by_id, remaining) + fixed if free else fixed
        totals = totals_for(fitted, foods_by_id)
        return Response({'items': fitted, 'totals': totals, 'targets': targets, 'on_target': within(totals, targets)})


class PlanReplaceView(APIView):
    """Save an edited plan: replaces its foods, servings and meals in one step."""

    @transaction.atomic
    def put(self, request, plan_id):
        plan = get_object_or_404(plan_qs(request.user).select_related('client'), id=plan_id)
        items = request.data.get('items') or []
        if not items:
            return Response({'error': 'No items provided.'}, status=400)
        excluded = set(plan.client.excluded_foods.values_list('id', flat=True))
        foods = {f.id: f for f in FoodItem.objects.filter(id__in=[i.get('id') for i in items])}
        blocked = [foods[i['id']].name for i in items if i.get('id') in excluded and i.get('id') in foods]
        if blocked:
            return Response({'error': 'excluded_foods', 'foods': blocked}, status=400)
        slots = clean_meal_slots(request.data.get('meal_slots'))
        keys = {sl['key'] for sl in slots} | {m for e in items for m in (e.get('meals') or [])}
        tags_by_name = ensure_tags(sorted(keys))
        if slots:
            plan.meal_slots = slots
        plan.weekly = None  # foods changed, so the suggested week is out of date
        plan.items.all().delete()
        totals = {'protein': 0.0, 'carb': 0.0, 'fat': 0.0}
        for entry in items:
            food = foods.get(entry.get('id'))
            if food is None:
                continue
            qty = float(entry.get('quantity') or 0)
            if qty <= 0:
                continue
            item = DietItem.objects.create(
                plan=plan, food=food, category=entry.get('category') or food.food_type, quantity=qty,
                protein=food.protein * qty, carb=food.carb * qty, fat=food.fat * qty)
            for macro in totals:
                totals[macro] += getattr(food, macro) * qty
            meal_tags = [tags_by_name[m] for m in entry.get('meals') or [] if m in tags_by_name]
            if meal_tags:
                item.tags.set(meal_tags)
                shares = {str(tags_by_name[k].id): float(v) for k, v in (entry.get('shares') or {}).items()
                          if k in tags_by_name}
                if shares:
                    item.meal_shares = shares
                    item.save(update_fields=['meal_shares'])
        client = plan.client
        plan.name = (request.data.get('name') or plan.name)[:255]
        plan.total_protein, plan.total_carb, plan.total_fat = totals['protein'], totals['carb'], totals['fat']
        plan.missing_protein = max(0, (client.target_protein or 0) - totals['protein'])
        plan.missing_carb = max(0, (client.target_carb or 0) - totals['carb'])
        plan.missing_fat = max(0, (client.target_fat or 0) - totals['fat'])
        plan.save()
        return Response({'plan_id': plan.id})


# -------------------------------------------------------- common foods ---

class CommonFoodsView(APIView):
    """The 6 most-used foods per group, shown ready in the plan builder."""

    def get(self, request):
        return Response(common_foods(request.user))


# --------------------------------------------------------- weekly plan ---

class PlanWeeklyView(APIView):
    def get(self, request, plan_id):
        plan = get_object_or_404(plan_qs(request.user), id=plan_id)
        return Response({'weekly': describe_week(plan.weekly)})

    def post(self, request, plan_id):
        """Make (or remake) the suggested week."""
        plan = get_object_or_404(plan_qs(request.user).select_related('client'), id=plan_id)
        seed = request.data.get('seed')
        plan.weekly = weekly_plan(plan, seed=int(seed) if str(seed or '').isdigit() else None)
        plan.save(update_fields=['weekly'])
        return Response({'weekly': describe_week(plan.weekly)})

    def put(self, request, plan_id):
        """Save the dietitian's edits to the week."""
        plan = get_object_or_404(plan_qs(request.user).select_related('client'), id=plan_id)
        days = request.data.get('days') or []
        excluded = set(plan.client.excluded_foods.values_list('id', flat=True))
        valid_ids = set(FoodItem.objects.values_list('id', flat=True))
        clean, blocked = [], set()
        for d in days[:7]:
            items = []
            for i in d.get('items', []):
                try:
                    fid, qty = int(i.get('food_id')), float(i.get('quantity'))
                except (TypeError, ValueError):
                    continue
                if fid not in valid_ids or qty <= 0:
                    continue
                if fid in excluded:
                    blocked.add(fid)
                    continue
                items.append({'meal': str(i.get('meal') or '')[:20], 'food_id': fid, 'quantity': round(qty, 2),
                              'swapped': bool(i.get('swapped'))})
            clean.append({'items': items})
        if blocked:
            names = list(FoodItem.objects.filter(id__in=blocked).values_list('name', flat=True))
            return Response({'error': 'excluded_foods', 'foods': names}, status=400)
        plan.weekly = {'days': clean, 'generated_at': (plan.weekly or {}).get('generated_at'), 'edited': True}
        plan.save(update_fields=['weekly'])
        return Response({'weekly': describe_week(plan.weekly)})


# ------------------------------------------------------------ check-ins ---

MAX_FILE_BYTES = 8 * 1024 * 1024
CHECKIN_NUMBERS = ['weight', 'pbf', 'smm', 'body_fat_mass', 'visceral_fat', 'waist_hip', 'inbody_bmr']


def checkin_json(r):
    has_file = hasattr(r, 'file')
    return {
        'id': r.id, 'date': r.created_at, 'source': r.source or 'visit', 'reviewed': r.reviewed, 'note': r.note,
        'weight': r.weight, 'pbf': r.pbf, 'smm': r.smm, 'body_fat_mass': r.body_fat_mass,
        'visceral_fat': r.visceral_fat, 'waist_hip': r.waist_hip, 'inbody_bmr': r.inbody_bmr,
        'calorie_target': r.calorie_target, 'bmr': r.bmr,
        'file': {'name': r.file.name, 'content_type': r.file.content_type} if has_file else None,
    }


def _decode_file(payload):
    """{'name', 'content_type', 'data' (base64)} -> (bytes, type, name) or raise ValueError."""
    if not payload:
        return None
    raw = payload.get('data') or ''
    if ',' in raw[:100]:
        raw = raw.split(',', 1)[1]  # data URL
    data = base64.b64decode(raw, validate=False)
    if len(data) > MAX_FILE_BYTES:
        raise ValueError('file_too_large')
    ctype = str(payload.get('content_type') or 'application/octet-stream')[:100]
    if not (ctype.startswith('image/') or ctype == 'application/pdf'):
        raise ValueError('file_type')
    return data, ctype, str(payload.get('name') or 'inbody')[:255]


def _number(value, lo, hi):
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    return v if lo <= v <= hi else None


@transaction.atomic
def create_checkin(client, data, *, source, reviewed=True, file=None, recalculate=True):
    """Save a check-in, update the client's current numbers and (optionally) the calorie target."""
    weight = _number(data.get('weight'), 20, 300)
    if weight is None:
        raise ValueError('weight_required')
    values = {
        'pbf': _number(data.get('pbf'), 2, 70), 'smm': _number(data.get('smm'), 5, 80),
        'body_fat_mass': _number(data.get('body_fat_mass'), 0, 200), 'visceral_fat': _number(data.get('visceral_fat'), 0, 60),
        'waist_hip': _number(data.get('waist_hip'), 0.3, 2), 'inbody_bmr': _number(data.get('inbody_bmr'), 500, 5000),
    }
    old_weight = client.weight
    client.weight = weight
    if values['pbf'] is not None:
        client.pbf = values['pbf']
    if values['smm'] is not None:
        client.smm = values['smm']
    if recalculate and old_weight and abs(old_weight - weight) >= 0.05:
        # Keep the client's current deficit/surplus and macro split; only the energy need moves with the weight.
        # Works for clients from the old app too (no saved formula -> the default formula).
        try:
            kw = dict(formula_name=client.formula_name or '', gender=client.gender, height=client.height,
                      age=client.age, work_style=client.work_style)
            before = calculate_targets(weight=old_weight, **kw)
            after = calculate_targets(weight=weight, **kw)
            old_target = client.target_calories or before['target_calories']
            new_target = round(old_target + after['tdee'] - before['tdee'])
            scale = new_target / old_target if old_target else 1
            client.bmr, client.activity_value, client.target_calories = after['bmr'], after['tdee'], new_target
            for field in ('target_protein', 'target_carb', 'target_fat'):
                value = getattr(client, field)
                if value:
                    setattr(client, field, round(value * scale, 1))
        except (ValueError, TypeError):
            pass
    client.save()
    rev = ClientProfileRevision.objects.create(
        client=client, age=client.age, weight=client.weight, height=client.height, gender=client.gender,
        goal=client.goal, smm=client.smm, pbf=client.pbf, work_style=client.work_style, bmr=client.bmr,
        calorie_target=client.target_calories, target_protein=client.target_protein, target_carb=client.target_carb,
        target_fat=client.target_fat, source=source, reviewed=reviewed, note=str(data.get('note') or '')[:2000],
        body_fat_mass=values['body_fat_mass'], visceral_fat=values['visceral_fat'], waist_hip=values['waist_hip'],
        inbody_bmr=values['inbody_bmr'])
    date = str(data.get('date') or '')
    if len(date) == 10 and date != timezone.localdate().isoformat():
        try:
            when = timezone.make_aware(datetime.fromisoformat(date + 'T12:00:00'))
            if when <= timezone.now() + timedelta(days=1):
                ClientProfileRevision.objects.filter(pk=rev.pk).update(created_at=when)
                rev.created_at = when
        except ValueError:
            pass
    if file:
        CheckInFile.objects.create(revision=rev, data=file[0], content_type=file[1], name=file[2])
    return rev


class CheckInsView(APIView):
    def get(self, request, client_id):
        client = get_object_or_404(client_qs(request.user), id=client_id)
        revs = client.profile_revisions.select_related('file').order_by('created_at')
        return Response({'checkins': [checkin_json(r) for r in revs], 'progress_change': progress_change(client)})

    def post(self, request, client_id):
        client = get_object_or_404(client_qs(request.user), id=client_id)
        before = client.target_calories
        try:
            file = _decode_file(request.data.get('file'))
            source = request.data.get('source') if request.data.get('source') in ('manual', 'inbody', 'visit') else 'manual'
            rev = create_checkin(client, request.data, source=source, file=file,
                                 recalculate=request.data.get('recalculate', True) is not False)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=400)
        rev = ClientProfileRevision.objects.select_related('file').get(pk=rev.pk)
        return Response({'checkin': checkin_json(rev), 'calories_before': before,
                         'calories_after': client.target_calories}, status=201)


class CheckInDetailView(APIView):
    def delete(self, request, checkin_id):
        rev = get_object_or_404(ClientProfileRevision.objects.filter(client__in=client_qs(request.user)), id=checkin_id)
        rev.delete()
        return Response(status=204)

    def post(self, request, checkin_id):
        """Mark a client-sent check-in as seen."""
        rev = get_object_or_404(ClientProfileRevision.objects.filter(client__in=client_qs(request.user)), id=checkin_id)
        ClientProfileRevision.objects.filter(pk=rev.pk).update(reviewed=True)
        return Response({'reviewed': True})


class CheckInFileView(APIView):
    def get(self, request, checkin_id):
        rev = get_object_or_404(ClientProfileRevision.objects.filter(client__in=client_qs(request.user)), id=checkin_id)
        f = getattr(rev, 'file', None)
        if f is None:
            return Response(status=404)
        return Response({'name': f.name, 'content_type': f.content_type,
                         'data': base64.b64encode(bytes(f.data)).decode()})


class InBodyReadView(APIView):
    """Read the numbers from an uploaded InBody sheet (AI). Nothing is saved here."""

    def post(self, request, client_id):
        client = get_object_or_404(client_qs(request.user), id=client_id)
        try:
            ai.check_allowed(request.user)
            file = _decode_file(request.data.get('file'))
            if not file:
                return Response({'detail': 'file_required'}, status=400)
            return Response(ai.read_inbody(file[0], file[1], client))
        except ai.AIUnavailable as exc:
            return _ai_error(exc)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=400)


class CheckInLinkView(APIView):
    def post(self, request, client_id):
        client = get_object_or_404(client_qs(request.user), id=client_id)
        link, _ = CheckInLink.objects.get_or_create(client=client)
        if request.data.get('new'):
            link.delete()
            link = CheckInLink.objects.create(client=client)
        return Response({'token': str(link.token)})


class PublicCheckInView(APIView):
    """The client's weekly check-in page. No login; the long random token is the key."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def _link(self, token):
        return get_object_or_404(CheckInLink.objects.select_related('client', 'client__user'), token=token, active=True)

    def get(self, request, token):
        link = self._link(token)
        client = link.client
        profile = UserProfile.objects.filter(user=client.user).first()
        last = client.profile_revisions.order_by('-created_at').first()
        return Response({
            'first_name': (client.name or '').split(' ')[0],
            'clinic_name': (profile.clinic_name if profile else '') or '',
            'logo_url': profile.logo_data if profile and profile.logo_data else None,
            'last_date': last.created_at if last else None,
        })

    def post(self, request, token):
        link = self._link(token)
        client = link.client
        recent = client.profile_revisions.filter(source='client_link', created_at__gte=timezone.now() - timedelta(hours=12))
        if recent.count() >= 3:
            return Response({'detail': 'too_many'}, status=429)
        try:
            file = _decode_file(request.data.get('file'))
            # The client's numbers never change the plan by themselves; the dietitian reviews them.
            create_checkin(client, {k: request.data.get(k) for k in ('weight', 'pbf', 'smm', 'note')},
                           source='client_link', reviewed=False, file=file, recalculate=False)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=400)
        return Response({'ok': True})


class AllergyModeView(APIView):
    """The dietitian's one-time choice for a client's allergies: 'hide' the foods or 'mark' them in red."""

    def put(self, request, client_id):
        client = get_object_or_404(client_qs(request.user), id=client_id)
        mode = request.data.get('mode')
        if mode not in ('hide', 'mark', ''):
            return Response({'mode': 'invalid'}, status=400)
        ClientProfile.objects.filter(pk=client.pk).update(allergy_mode=mode)
        return Response({'allergy_mode': mode})
