from django import forms

class ErrorReportForm(forms.Form):
    email = forms.EmailField(label="Seu email", required=True)
    message = forms.CharField(
        label="Mensagem (opcional)",
        required=False,
        widget=forms.Textarea(attrs={"rows": 4})
    )
    error_type = forms.CharField(required=True)  
