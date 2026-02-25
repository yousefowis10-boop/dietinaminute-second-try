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

urlpatterns = [
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
