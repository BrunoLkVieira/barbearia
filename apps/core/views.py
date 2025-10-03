from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse
from django.template import loader

# Create your views here.
def error404(request, ex):
    template = loader.get_template('core.404.html')
    return HttpResponse(content=template.render(), content_type='text/html; charset=utf8', status=404)

def error500(request):
    template = loader.get_template('core.500.html')
    return HttpResponse(content=template.render(), content_type='text/html; charset=utf8', status=500)

