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
from . import views_v3 as v3
from . import views_v4 as v4
from . import views_foods as vf
from . import views_reports as vr

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
    path('plan/<int:plan_id>/replace/', v2.PlanReplaceView.as_view()),
    path('plan/<int:plan_id>/weekly/', v2.PlanWeeklyView.as_view()),
    path('foods/common/', v2.CommonFoodsView.as_view()),
    path('clients/<int:client_id>/checkins/', v2.CheckInsView.as_view()),
    path('clients/<int:client_id>/inbody-read/', v2.InBodyReadView.as_view()),
    path('clients/<int:client_id>/checkin-link/', v2.CheckInLinkView.as_view()),
    path('checkins/<int:checkin_id>/', v2.CheckInDetailView.as_view()),
    path('checkins/<int:checkin_id>/file/', v2.CheckInFileView.as_view()),
    path('templates/', v2.PlanTemplateListView.as_view()),
    path('templates/<int:template_id>/', v2.PlanTemplateDetailView.as_view()),
    path('templates/<int:template_id>/apply/<int:client_id>/', v2.ApplyTemplateView.as_view()),
    path('workouts/', v2.WorkoutListView.as_view()),
    path('workouts/<int:workout_id>/', v2.WorkoutDetailView.as_view()),
    path('ai/clients/<int:client_id>/summary/', v2.AISummaryView.as_view()),
    path('ai/clients/<int:client_id>/draft-plan/', v2.AIDraftPlanView.as_view()),
    path('ai/clients/<int:client_id>/follow-up/', v2.AIFollowUpView.as_view()),
    path('ai/plans/<int:plan_id>/client-message/', v2.AIClientMessageView.as_view()),
    path('today/', v3.TodayView.as_view()),
    path('counts/', v3.CountsView.as_view()),
    path('calendars/', v3.CalendarListView.as_view()),
    path('calendars/<int:calendar_id>/', v3.CalendarDetailView.as_view()),
    path('calendars/<int:calendar_id>/types/', v3.AppointmentTypeListView.as_view()),
    path('calendars/<int:calendar_id>/free-slots/', v3.FreeSlotsView.as_view()),
    path('appointment-types/<int:type_id>/', v3.AppointmentTypeDetailView.as_view()),
    path('appointments/', v3.AppointmentListView.as_view()),
    path('appointments/<int:appointment_id>/', v3.AppointmentDetailView.as_view()),
    path('appointments/<int:appointment_id>/reminder/', v3.AppointmentReminderView.as_view()),
    path('clients/<int:client_id>/packages/', v3.PackageListView.as_view()),
    path('packages/<int:package_id>/', v3.PackageDetailView.as_view()),
    path('clients/<int:client_id>/app/', v3.ClientAppLinkView.as_view()),
    path('clients/<int:client_id>/booking-offer/', v3.BookingOfferView.as_view()),
    path('plan/<int:plan_id>/workout-suggestions/', v3.WorkoutSuggestionsView.as_view()),
    path('clients/<int:client_id>/blood-tests/', v4.BloodTestListView.as_view()),
    path('clients/<int:client_id>/blood-read/', v4.BloodReadView.as_view()),
    path('clients/<int:client_id>/history/', v4.HistoryView.as_view()),
    path('clients/<int:client_id>/micro-needs/', v4.MicroNeedsView.as_view()),
    path('blood-tests/<int:test_id>/', v4.BloodTestDetailView.as_view()),
    path('blood-files/<int:file_id>/', v4.BloodTestFileView.as_view()),
    path('plan/<int:plan_id>/micros/', v4.PlanMicrosView.as_view()),
    path('recipes/<int:food_id>/', v4.RecipeView.as_view()),
    path('foods/read-label/', vf.FoodLabelReadView.as_view()),
    path('foods/add/', vf.FoodAddView.as_view()),
    path('foods/review/', vf.FoodReviewView.as_view()),
    path('foods/review/<int:food_id>/', vf.FoodReviewView.as_view()),
    path('team/', vf.TeamView.as_view()),
    path('finance/', vr.FinanceView.as_view()),
    path('contacts/', vr.ContactsView.as_view()),
    path('payments/', vr.PaymentView.as_view()),
    path('payments/<int:payment_id>/', vr.PaymentView.as_view()),
    path('clients/<int:client_id>/open-items/', vr.OpenItemsView.as_view()),
    path('clients/<int:client_id>/contact-notes/', vr.ContactNotesView.as_view()),
    path('plan/<int:plan_id>/supplements/', v2.PlanSupplementsView.as_view()),
    path('clients/<int:client_id>/allergy-mode/', v2.AllergyModeView.as_view()),
    path('team/members/', vf.TeamMemberView.as_view()),
    path('team/members/<int:member_id>/', vf.TeamMemberView.as_view()),
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
