from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.forms.models import model_to_dict
from collections import defaultdict
from decimal import Decimal, ROUND_HALF_UP

from .services import client_qs, plan_qs, calculate_targets, split_plan
from .models import ClientProfile, DietPlan, FoodItem, DietItem, ClientProfileRevision, BMRFormula, Tag, DetailedProfile, DetailedProfileRevision, UserProfile
from .serializers import ClientProfileSerializer, DietPlanSerializer, FoodItemSerializer, BMRFormulaSerializer, DietItemTagUpdateSerializer, \
    TagSerializer, DetailedProfileSerializer, UserProfileSerializer, DetailedProfileRevisionSerializer


class ClientProfileRevisionsListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DetailedProfileRevisionSerializer

    def get_queryset(self):
        client_id = self.kwargs.get('client_id')
        return DetailedProfileRevision.objects.filter(client__in=client_qs(self.request.user), client__id=client_id).order_by('-modified_at')

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)

    def put(self, request):
        profile = get_object_or_404(UserProfile, user=request.user)
        serializer = UserProfileSerializer(profile, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        profile = get_object_or_404(UserProfile, user=request.user)
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class ClientProfileDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            client = client_qs(request.user).get(pk=pk)
        except ClientProfile.DoesNotExist:
            return Response({"detail": "Client not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = ClientProfileSerializer(client)
        return Response(serializer.data)

class ClientProfileHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if not client_qs(request.user).filter(pk=pk).exists():
            return Response({"detail": "Client not found"}, status=status.HTTP_404_NOT_FOUND)
        revisions = ClientProfileRevision.objects.filter(client_id=pk).order_by('-created_at')
        data = [{
            "created_at": rev.created_at,
            "age": rev.age,
            "weight": rev.weight,
            "height": rev.height,
            "gender": rev.gender,
            "goal": rev.goal,
            "work_style": rev.work_style,
            "bmr": rev.bmr,
            "pbf": rev.pbf,
            "smm": rev.smm,
            "calorie_target": rev.calorie_target,
            "target_protein": rev.target_protein,
            "target_carb": rev.target_carb,
            "target_fat": rev.target_fat
        } for rev in revisions]
        return Response(data)
    

class ClientProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        clients = client_qs(request.user).order_by('-created_at')
        serializer = ClientProfileSerializer(clients, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        client_id = request.data.get("id")
        create_revision = request.data.get("create_revision", True)
        if client_id:
            try:
                client = client_qs(request.user).get(id=client_id)
                serializer = ClientProfileSerializer(client, data=request.data, partial=True)
            except ClientProfile.DoesNotExist:
                return Response({"detail": "Client not found."}, status=404)
        else:
            serializer = ClientProfileSerializer(data=request.data)

        if serializer.is_valid():
            carb_percentage = request.data.get('carb_percentage')
            protein_percentage = request.data.get('protein_percentage')
            fat_percentage = request.data.get('fat_percentage')
            bmr = request.data.get('bmr')
            activity_value = request.data.get('activity_value')
            target_calories = request.data.get('target_calories')
            if request.data.get('formula'):
                # New app: the server does the calculation from the client's numbers.
                existing = ({k: getattr(serializer.instance, k, None) for k in ('gender', 'weight', 'height', 'age', 'work_style')}
                            if serializer.instance else {})
                data = {**existing, **serializer.validated_data}
                try:
                    calc = calculate_targets(
                        formula_name=request.data.get('formula'), gender=data['gender'], weight=data['weight'],
                        height=data['height'], age=data['age'], work_style=data['work_style'],
                        adjustment=float(request.data.get('adjustment') or 0),
                        protein_pct=float(protein_percentage or 25), carb_pct=float(carb_percentage or 55),
                        fat_pct=float(fat_percentage or 20))
                except (ValueError, KeyError, TypeError) as exc:
                    return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
                bmr, activity_value, target_calories = calc['bmr'], calc['tdee'], calc['target_calories']
                protein_percentage, carb_percentage, fat_percentage = calc['protein_pct'], calc['carb_pct'], calc['fat_pct']
            save_kwargs = dict(
                bmr=bmr,
                activity_value=activity_value,
                target_calories=target_calories,
                carb_percentage=carb_percentage,
                protein_percentage=protein_percentage,
                fat_percentage=fat_percentage,
            )
            if serializer.instance is None:
                save_kwargs['user'] = request.user
            instance = serializer.save(**save_kwargs)
            if create_revision:
                ClientProfileRevision.objects.create(
                    client=instance,
                    age=instance.age,
                    weight=instance.weight,
                    height=instance.height,
                    gender=instance.gender,
                    goal=instance.goal,
                    smm=instance.smm,
                    pbf=instance.pbf,
                    work_style=instance.work_style,
                    bmr=instance.bmr,
                    calorie_target=instance.target_calories,
                    target_protein=instance.target_protein,
                    target_carb=instance.target_carb,
                    target_fat=instance.target_fat
                )

            return Response(ClientProfileSerializer(instance).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GenerateDietPlanView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        profile = user.profile

        target_p = profile.target_protein
        target_c = profile.target_carb
        target_f = profile.target_fat

        def fill_macro(food_type, target, macro_key):
            total = 0
            food_quantities = defaultdict(int)
            foods = FoodItem.objects.filter(food_type=food_type).order_by(f"-{macro_key}")
            
            for food in foods:
                if total >= target:
                    break
                macro_val = getattr(food, macro_key)
                if macro_val == 0:
                    continue
                
                # How much more we can use of this food
                while total + macro_val <= target:
                    total += macro_val
                    food_quantities[food] += 1

            # Convert to list of tuples for consistency
            items = [(food, qty) for food, qty in food_quantities.items()]
            return total, items

        protein_total, protein_items = fill_macro('protein', target_p, 'protein')
        carb_total, carb_items = fill_macro('carb', target_c, 'carb')
        fat_total, fat_items = fill_macro('fat', target_f, 'fat')

        plan = DietPlan.objects.create(
            user=user,
            total_protein=protein_total,
            total_carb=carb_total,
            total_fat=fat_total,
            missing_protein=max(0, target_p - protein_total),
            missing_carb=max(0, target_c - carb_total),
            missing_fat=max(0, target_f - fat_total),
        )

        for category, items in [('protein', protein_items), ('carb', carb_items), ('fat', fat_items)]:
            for food, qty in items:
                DietItem.objects.create(
                    plan=plan,
                    food=food,
                    category=category,
                    quantity=qty,
                    protein=food.protein * qty,
                    carb=food.carb * qty,
                    fat=food.fat * qty,
                )

        return Response({"message": "Diet plan generated", "plan_id": plan.id})

class LatestDietPlanView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        plan = DietPlan.objects.filter(user=request.user).order_by('-created_at').first()
        if not plan:
            return Response({"detail": "No diet plan found."}, status=404)
        serializer = DietPlanSerializer(plan)
        return Response(serializer.data)

class DietPlanDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        plan = get_object_or_404(plan_qs(request.user), pk=pk)
        serializer = DietPlanSerializer(plan)
        return Response(serializer.data)
    
    def put(self, request, pk):
        plan = get_object_or_404(plan_qs(request.user), pk=pk)
        items_data = request.data.get("items", [])
        name = request.data.get("name", 'Default Diet Plan')

        if not isinstance(items_data, list):
            return Response(
                {"detail": "Items must be a list."},
                status=status.HTTP_400_BAD_REQUEST
            )

        for item_data in items_data:
            item_id = item_data.get("item_id")
            quantity = float(item_data.get("quantity", 1))
            category = item_data.get("category")

            if not item_id:
                return Response(
                    {"detail": "Each item must have an item_id."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if plan.client.excluded_foods.filter(id=item_id).exists():
                return Response({"error": "excluded_foods", "foods": [item_id]}, status=status.HTTP_400_BAD_REQUEST)

            try:
                diet_item = plan.items.get(food_id=item_id)
                # item = get_object_or_404(DietItem, plan=plan, food_id=x)
            except DietItem.DoesNotExist:
                diet_item = DietItem.objects.create(
                    plan=plan,
                    food_id=item_id,
                    category=category,
                    quantity=quantity,
                    protein=0,
                    carb=0,
                    fat=0
                )
            plan.name = name
            plan.save()
            # Only update provided fields
            if quantity is not None:
                diet_item.quantity = quantity
                diet_item.protein = diet_item.food.protein * quantity
                diet_item.carb = diet_item.food.carb * quantity
                diet_item.fat = diet_item.food.fat * quantity
            if category:
                diet_item.category = category
            diet_item.save()

        # Return updated plan
        serializer = DietPlanSerializer(plan)
        return Response(serializer.data, status=status.HTTP_200_OK)

class ClientDietPlansView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_id):
        try:
            client = client_qs(request.user).get(id=client_id)
        except ClientProfile.DoesNotExist:
            return Response({"detail": "Client not found."}, status=status.HTTP_404_NOT_FOUND)

        plans = DietPlan.objects.filter(client=client).order_by("-created_at")
        serializer = DietPlanSerializer(plans, many=True)
        return Response(serializer.data)

class AddItemToPlanView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        plan = get_object_or_404(plan_qs(request.user), pk=pk)
        food_id = request.data.get("food_id")
        quantity = float(request.data.get("quantity", 1))
        category = request.data.get("category")

        food = get_object_or_404(FoodItem, pk=food_id)

        DietItem.objects.create(
            plan=plan,
            food=food,
            category=category,
            quantity=quantity,
            protein=food.protein * quantity,
            carb=food.carb * quantity,
            fat=food.fat * quantity,
        )

        plan.total_protein += food.protein * quantity
        plan.total_carb += food.carb * quantity
        plan.total_fat += food.fat * quantity

        profile = request.user.profile
        plan.missing_protein = max(0, profile.target_protein - plan.total_protein)
        plan.missing_carb = max(0, profile.target_carb - plan.total_carb)
        plan.missing_fat = max(0, profile.target_fat - plan.total_fat)
        plan.save()

        return Response({"message": "Item added and plan updated."})

class FoodItemListView(ListAPIView):
    queryset = FoodItem.objects.all()
    serializer_class = FoodItemSerializer
    permission_classes = [IsAuthenticated]


class GenerateCustomPlanView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        profile = user.profile
        preferred_ids = request.data.get("preferred_food_ids", [])

        if not preferred_ids:
            return Response({"error": "No preferred food items provided."}, status=400)

        target_p = profile.target_protein
        target_c = profile.target_carb
        target_f = profile.target_fat

        used_ids = set()
        food_entries = defaultdict(lambda: {"qty": 0, "category": "", "protein": 0, "carb": 0, "fat": 0})

        protein_total = carb_total = fat_total = 0

        # Step 1: Add user-selected items
        for food in FoodItem.objects.filter(id__in=preferred_ids):
            qty = 1
            food_entries[food.id]["qty"] += qty
            food_entries[food.id]["category"] = food.food_type
            food_entries[food.id]["protein"] += food.protein * qty
            food_entries[food.id]["carb"] += food.carb * qty
            food_entries[food.id]["fat"] += food.fat * qty
            used_ids.add(food.id)

            protein_total += food.protein
            carb_total += food.carb
            fat_total += food.fat

        # Step 2: Fill remaining macros
        def fill_macro(food_type, macro_key, current, target):
            nonlocal protein_total, carb_total, fat_total
            foods = FoodItem.objects.filter(food_type=food_type).exclude(id__in=used_ids).order_by(f"-{macro_key}")
            for food in foods:
                if current >= target:
                    break
                macro_val = getattr(food, macro_key)
                if macro_val == 0:
                    continue
                qty = 1
                while current + macro_val <= target:
                    current += macro_val
                    food_entries[food.id]["qty"] += qty
                    food_entries[food.id]["category"] = food_type
                    food_entries[food.id]["protein"] += food.protein * qty
                    food_entries[food.id]["carb"] += food.carb * qty
                    food_entries[food.id]["fat"] += food.fat * qty
                    qty += 1
                used_ids.add(food.id)

            if macro_key == "protein":
                protein_total = current
            elif macro_key == "carb":
                carb_total = current
            elif macro_key == "fat":
                fat_total = current

        fill_macro("protein", "protein", protein_total, target_p)
        fill_macro("carb", "carb", carb_total, target_c)
        fill_macro("fat", "fat", fat_total, target_f)

        # Save Plan
        plan = DietPlan.objects.create(
            user=user,
            total_protein=protein_total,
            total_carb=carb_total,
            total_fat=fat_total,
            missing_protein=max(0, target_p - protein_total),
            missing_carb=max(0, target_c - carb_total),
            missing_fat=max(0, target_f - fat_total),
        )

        # Save Unique Diet Items
        for food_id, data in food_entries.items():
            food = FoodItem.objects.get(id=food_id)
            DietItem.objects.create(
                plan=plan,
                food=food,
                category=data["category"],
                quantity=data["qty"],
                protein=data["protein"],
                carb=data["carb"],
                fat=data["fat"],
            )

        return Response({
            "message": "Custom meal plan generated",
            "plan_id": plan.id,
            "completed": all([
                target_p <= protein_total,
                target_c <= carb_total,
                target_f <= fat_total,
            ]),
            "missing": {
                "protein": max(0, target_p - protein_total),
                "carb": max(0, target_c - carb_total),
                "fat": max(0, target_f - fat_total),
            },
        })


class CustomDietPlanCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, client_id):
        try:
            client = client_qs(request.user).get(id=client_id)
        except ObjectDoesNotExist:
            return Response({"error": "Client not found"}, status=status.HTTP_404_NOT_FOUND)

        items = request.data.get("items", [])
        name = request.data.get("name", 'Default Diet Plan')

        if not items:
            return Response({"error": "No items provided."}, status=status.HTTP_400_BAD_REQUEST)

        excluded = set(client.excluded_foods.values_list('id', flat=True))
        blocked = [i.get("id") for i in items if i.get("id") in excluded]
        if blocked:
            names = list(FoodItem.objects.filter(id__in=blocked).values_list('name', flat=True))
            return Response({"error": "excluded_foods", "foods": names}, status=status.HTTP_400_BAD_REQUEST)

        total_p = total_c = total_f = 0
        diet_items = []

        for item in items:
            food_id = item.get("id")
            qty = float(item.get("quantity"))
            category = item.get("category")

            try:
                food = FoodItem.objects.get(id=food_id)
            except FoodItem.DoesNotExist:
                continue

            protein = food.protein * qty
            carb = food.carb * qty
            fat = food.fat * qty

            total_p += protein
            total_c += carb
            total_f += fat

            diet_items.append({
                "food": food,
                "category": category,
                "quantity": qty,
                "protein": protein,
                "carb": carb,
                "fat": fat,
                "meals": item.get("meals") or [],
                "shares": item.get("shares") or {},
            })


        # Save plan
        plan = DietPlan.objects.create(
            user=request.user,
            client=client,
            name=name,
            total_protein=total_p,
            total_carb=total_c,
            total_fat=total_f,
            missing_protein=max(0, client.target_protein - total_p),
            missing_carb=max(0, client.target_carb - total_c),
            missing_fat=max(0, client.target_fat - total_f),
        )

        tags_by_name = {t.name: t for t in Tag.objects.all()}
        for item in diet_items:
            diet_item = DietItem.objects.create(
                plan=plan,
                food=item["food"],
                category=item["category"],
                quantity=item["quantity"],
                protein=item["protein"],
                carb=item["carb"],
                fat=item["fat"],
            )
            # Optional: meals chosen up front (templates, AI drafts, new builder).
            meal_tags = [tags_by_name[m] for m in item["meals"] if m in tags_by_name]
            if meal_tags:
                diet_item.tags.set(meal_tags)
                shares = {str(tags_by_name[k].id): float(v) for k, v in item["shares"].items() if k in tags_by_name}
                if shares:
                    diet_item.meal_shares = shares
                    diet_item.save(update_fields=["meal_shares"])

        return Response({"message": "Custom diet plan created", "plan_id": plan.id})

class BMRFormulaListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        formulas = BMRFormula.objects.prefetch_related('gender_formulas', 'activity_levels').all()
        serializer = BMRFormulaSerializer(formulas, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class TagListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tags = Tag.objects.all()
        serializer = TagSerializer(tags, many=True)
        return Response(serializer.data)

# class DietPlanTagsUpdateAPIView(APIView):

#     def put(self, request, plan_id):
#         diet_plan = get_object_or_404(DietPlan, id=plan_id)
#         items_data = request.data.get("items", [])

#         for item_data in items_data:
#             item_id = item_data.get("item_id")
#             tag_ids = item_data.get("tag_ids", [])
#             quantity = item_data.get("quantity")
#             food_id = item_data.get("food_id")

#             if item_id:
#                 # Update existing DietItem
#                 item = get_object_or_404(DietItem, id=item_id, plan=diet_plan)
#                 item.quantity = quantity
#                 item.tags.set(tag_ids)
#                 item.save()
#             else:
#                 # Create new DietItem
#                 if not food_id:
#                     return Response({"detail": "food_id is required for new items."}, status=status.HTTP_400_BAD_REQUEST)
#                 food = get_object_or_404(Food, id=food_id)
#                 new_item = DietItem.objects.create(
#                     plan=diet_plan,
#                     food=food,
#                     quantity=quantity
#                 )
#                 new_item.tags.set(tag_ids)

#         return Response({"detail": "Meal plan updated successfully"}, status=status.HTTP_200_OK)

class DietPlanTagsUpdateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, plan_id):
        diet_plan = get_object_or_404(plan_qs(request.user), id=plan_id)
        updates = request.data.get("items", [])

        for entry in updates:
            serializer = DietItemTagUpdateSerializer(data=entry)
            serializer.is_valid(raise_exception=True)

            item_id = serializer.validated_data['item_id']
            tag_ids = serializer.validated_data['tag_ids']

            item = get_object_or_404(DietItem, id=item_id, plan=diet_plan)
            valid_tag_ids = list(Tag.objects.filter(id__in=tag_ids).values_list('id', flat=True))
            item.tags.set(valid_tag_ids)
            shares = entry.get("shares") or {}
            item.meal_shares = {str(k): float(v) for k, v in shares.items()
                                if str(k).isdigit() and int(k) in valid_tag_ids and float(v) >= 0}
            item.save(update_fields=["meal_shares"])

        return Response({"detail": "Tags updated successfully"}, status=status.HTTP_200_OK)

class DietPlanSplitView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, plan_id):
        try:
            diet_plan = plan_qs(request.user).get(id=plan_id)
        except DietPlan.DoesNotExist:
            return Response({"error": "Diet plan not found"}, status=status.HTTP_404_NOT_FOUND)

        result, unassigned = split_plan(diet_plan)

        client_data = ClientProfileSerializer(diet_plan.client).data

        response_data = {
            "name": diet_plan.name,
            "client": client_data,
            "split": result,
            "unassigned": unassigned,
        }

        return Response(response_data, status=status.HTTP_200_OK)

class ClientDetailedProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_id):
        # Fetch the client based on the client_id and user
        try:
            client = client_qs(request.user).get(id=client_id)
        except ClientProfile.DoesNotExist:
            return Response({"detail": "Client not found."}, status=status.HTTP_404_NOT_FOUND)

        # # Retrieve the DetailedProfile associated with the client
        # try:
        #     detailed_profile = DetailedProfile.objects.get(client=client)
        # except DetailedProfile.DoesNotExist:
        #     return Response({"detail": "Detailed profile not found."}, status=status.HTTP_404_NOT_FOUND)
        detailed_profile, created = DetailedProfile.objects.get_or_create(client=client, defaults={'user': client.user})
        if created:
            if client.name:
                parts = client.name.strip().split(' ', 1)
                detailed_profile.first_name = parts[0]
                detailed_profile.last_name = parts[1] if len(parts) > 1 else ''
            detailed_profile.height = client.height
            detailed_profile.weight = client.weight
            detailed_profile.gender = 'Male' if client.gender == 'M' else 'Female'
            detailed_profile.skeletal_muscle_mass = client.smm
            detailed_profile.body_fat_percentage = client.pbf


        # Serialize the DetailedProfile data
        serializer = DetailedProfileSerializer(detailed_profile)
        return Response(serializer.data)

    def put(self, request, client_id):
        # Fetch the client based on the client_id and user
        try:
            client = client_qs(request.user).get(id=client_id)
        except ClientProfile.DoesNotExist:
            return Response({"detail": "Client not found."}, status=status.HTTP_404_NOT_FOUND)

        # Retrieve the DetailedProfile associated with the client, or create a new one if it doesn't exist
        detailed_profile, created = DetailedProfile.objects.get_or_create(client=client, defaults={'user': client.user})

        # Use the serializer to validate and update the profile
        serializer = DetailedProfileSerializer(detailed_profile, data=request.data, partial=True)

        if serializer.is_valid():
            if not created:
                # Inline revision creation (4 lines)
                data = model_to_dict(detailed_profile, exclude=['id', 'user', 'client'])
                DetailedProfileRevision.objects.create(
                    detailed_profile=detailed_profile,
                    modified_by=request.user,
                    user=detailed_profile.user,
                    client=detailed_profile.client,
                    revision_reason="Before update",
                    **data
                )
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)