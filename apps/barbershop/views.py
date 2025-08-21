from django.shortcuts import render

# Create your views here.
def UnitView(request):
  return render(request, "barbershop/unit.html")
   
