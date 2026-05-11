from django.core.mail import send_mail


def send_activation_email(user, token, base_url):
    activation_url = f"{base_url.rstrip('/')}/?activate={token}"
    full_name = f"{user.first_name} {user.last_name}".strip() or user.username

    subject = "Activá tu cuenta en ERP-LG"

    text_body = f"""Hola {full_name},

Tu cuenta en ERP-LG fue creada. Para activarla y establecer tu contraseña, ingresá al siguiente enlace:

{activation_url}

Este enlace es válido por 72 horas. Si no solicitaste esta cuenta, podés ignorar este mensaje.

— Equipo SIBOTEC
"""

    html_body = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background-color:#18181b;border:1px solid #27272a;border-radius:8px;overflow:hidden;">

        <tr>
          <td style="background-color:#1e1e21;border-bottom:1px solid #27272a;padding:20px 32px;">
            <span style="font-family:monospace;font-size:13px;font-weight:700;color:#a1a1aa;letter-spacing:0.15em;text-transform:uppercase;">ERP-LG · SIBOTEC</span>
          </td>
        </tr>

        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#f4f4f5;">Hola, {full_name}</p>
            <p style="margin:0 0 24px 0;font-size:14px;color:#a1a1aa;line-height:1.6;">
              Tu cuenta en el sistema ERP-LG fue creada. Para activarla y establecer tu contraseña, hacé clic en el botón de abajo.
            </p>

            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
              <tr>
                <td style="background-color:#3b82f6;border-radius:6px;">
                  <a href="{activation_url}"
                     style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">
                    Activar mi cuenta
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 4px 0;font-size:12px;color:#71717a;">Si el botón no funciona, copiá este enlace en tu navegador:</p>
            <p style="margin:0 0 24px 0;font-size:11px;color:#3b82f6;word-break:break-all;">{activation_url}</p>

            <p style="margin:0;font-size:12px;color:#52525b;border-top:1px solid #27272a;padding-top:16px;">
              Este enlace es válido por <strong style="color:#71717a;">72 horas</strong>. Si no solicitaste esta cuenta podés ignorar este mensaje.
            </p>
          </td>
        </tr>

        <tr>
          <td style="background-color:#0f0f11;border-top:1px solid #27272a;padding:16px 32px;">
            <p style="margin:0;font-size:11px;color:#3f3f46;">SIBOTEC SRL — Sistema ERP Industrial</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""

    send_mail(
        subject=subject,
        message=text_body,
        from_email=None,  # uses DEFAULT_FROM_EMAIL
        recipient_list=[user.email],
        html_message=html_body,
        fail_silently=False,
    )
