from django.shortcuts import render

# Create your views here.
from django.shortcuts import render

def landing_page(request):
    # return render(request, "system_plan/landing.html")
    return render(request, "barbershop/myWebsite.html")
