from django.shortcuts import render

# Create your views here.

def landing_page(request):
     return render(request, "system_plan/landing.html")
    # return render(request, "schedule/agenda.html")
