from django.urls import path
from .views import ClientProfileView, \
    ClientProfileDetailView, \
    GenerateDietPlanView, \
    LatestDietPlanView, \
    AddItemToPlanView, \
    FoodItemListView, \
    GenerateCustomPlanView, \
    CustomDietPlanCreateView, \
    ClientDietPlansView, \
    DietPlanDetailView, \
    ClientProfileHistoryView, \
    BMRFormulaListAPIView, \
    TagListAPIView, \
    DietPlanTagsUpdateAPIView, \
    DietPlanSplitView, \
    ClientDetailedProfileView, \
    UserProfileView, \
    ClientProfileRevisionsListView

from . import views_v2 as v2

urlpatterns = [
    # --- upgrade ---
    path('account/', v2.AccountView.as_view()),
    path('account/branding/', v2.BrandingView.as_view()),
    path('dashboard/', v2.DashboardView.as_view()),
    path('calc-targets/', v2.CalcTargetsView.as_view()),
    path('clients/<int:client_id>/fit-servings/', v2.FitServingsView.as_view()),
    path('clients/<int:client_id>/overview/', v2.ClientOverviewView.as_view()),
    path('clients/<int:client_id>/exclusions/', v2.ClientExclusionsView.as_view()),
    path('clients/<int:client_id>/interview-link/', v2.InterviewLinkView.as_view()),
    path('clients/<int:client_id>/interview-reviewed/', v2.InterviewReviewedView.as_view()),
    path('plan/<int:plan_id>/sheet/', v2.PlanSheetView.as_view()),
    path('plan/<int:plan_id>/workout/', v2.PlanWorkoutView.as_view()),
    path('plan/<int:plan_id>/notes/', v2.PlanNotesView.as_view()),
    path('plan/<int:plan_id>/delete/', v2.PlanDeleteView.as_view()),
    path('templates/', v2.PlanTemplateListView.as_view()),
    path('templates/<int:template_id>/', v2.PlanTemplateDetailView.as_view()),
    path('templates/<int:template_id>/apply/<int:client_id>/', v2.ApplyTemplateView.as_view()),
    path('workouts/', v2.WorkoutListView.as_view()),
    path('workouts/<int:workout_id>/', v2.WorkoutDetailView.as_view()),
    path('ai/clients/<int:client_id>/summary/', v2.AISummaryView.as_view()),
    path('ai/clients/<int:client_id>/draft-plan/', v2.AIDraftPlanView.as_view()),
    path('ai/clients/<int:client_id>/follow-up/', v2.AIFollowUpView.as_view()),
    path('ai/plans/<int:plan_id>/client-message/', v2.AIClientMessageView.as_view()),
    # --- existing ---
    path('profile/', UserProfileView.as_view(), name='user-profile'),

    path("clients/", ClientProfileView.as_view(), name="client-profile"),
    path('clients/<int:pk>/', ClientProfileDetailView.as_view(), name='client-detail'),
    path("clients/<int:pk>/profile-history/", ClientProfileHistoryView.as_view(), name="client-profile-history"),
    path("clients/<int:client_id>/detailed-profile/", ClientDetailedProfileView.as_view(), name="client-detailed-profile"),
    path('clients/<int:client_id>/detailed-profile-history/', ClientProfileRevisionsListView.as_view(), name='client-profile-history'),

    path("foods/", FoodItemListView.as_view(), name="food-list"),
    path("plan/custom/<int:client_id>/", CustomDietPlanCreateView.as_view(), name="custom_diet_plan"),
    path("plan/client/<int:client_id>/", ClientDietPlansView.as_view(), name="client-diet-plans"),
    path('plan/<int:pk>/', DietPlanDetailView.as_view(), name='diet-plan-detail'),

    # path('generate-plan/', GenerateDietPlanView.as_view(), name='generate-diet-plan'),
    # path("plan/custom/", GenerateCustomPlanView.as_view(), name="plan-custom"),
    path('plan/latest/', LatestDietPlanView.as_view(), name='latest-diet-plan'),
    path('bmr-formulas/', BMRFormulaListAPIView.as_view(), name='bmr-formulas'),

    path('tags/', TagListAPIView.as_view(), name='tag-list'),
    path('plan/<int:plan_id>/update-tags/', DietPlanTagsUpdateAPIView.as_view(), name='update-plan-tags'),
    path('plan/<int:plan_id>/split/', DietPlanSplitView.as_view(), name='split-plan'),


    # path('plan/<int:pk>/add-item/', AddItemToPlanView.as_view(), name='add-item-to-plan'),
]
