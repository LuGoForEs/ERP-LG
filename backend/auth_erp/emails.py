from django.core.mail import send_mail


def send_reset_email(user, token, base_url):
    reset_url = f"{base_url.rstrip('/')}/?reset={token}"
    full_name = f"{user.first_name} {user.last_name}".strip() or user.username

    subject = "Recuperación de contraseña — ERP-LG"

    text_body = f"""Hola {full_name},

Recibimos una solicitud para restablecer la contraseña de tu cuenta en ERP-LG.

Para continuar, ingresá al siguiente enlace:

{reset_url}

Este enlace es válido por 72 horas. Si no solicitaste este cambio, podés ignorar este mensaje.

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
              Recibimos una solicitud para restablecer la contraseña de tu cuenta. Hacé clic en el botón de abajo para continuar.
            </p>

            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
              <tr>
                <td style="background-color:#f59e0b;border-radius:6px;">
                  <a href="{reset_url}"
                     style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#09090b;text-decoration:none;letter-spacing:0.02em;">
                    Restablecer contraseña
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 4px 0;font-size:12px;color:#71717a;">Si el botón no funciona, copiá este enlace en tu navegador:</p>
            <p style="margin:0 0 24px 0;font-size:11px;color:#f59e0b;word-break:break-all;">{reset_url}</p>

            <p style="margin:0;font-size:12px;color:#52525b;border-top:1px solid #27272a;padding-top:16px;">
              Este enlace es válido por <strong style="color:#71717a;">72 horas</strong>. Si no solicitaste este cambio podés ignorar este mensaje — tu contraseña no será modificada.
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
        from_email=None,
        recipient_list=[user.email],
        html_message=html_body,
        fail_silently=False,
    )


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


# ─── Root: confirmaciones (links válidos 1 hora) ──────────────────────────────

def _render_email_html(full_name, intro, button_label, url, button_color, footer_note):
    return f"""<!DOCTYPE html>
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
            <p style="margin:0 0 24px 0;font-size:14px;color:#a1a1aa;line-height:1.6;">{intro}</p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
              <tr>
                <td style="background-color:{button_color};border-radius:6px;">
                  <a href="{url}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#09090b;text-decoration:none;letter-spacing:0.02em;">{button_label}</a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 4px 0;font-size:12px;color:#71717a;">Si el botón no funciona, copiá este enlace en tu navegador:</p>
            <p style="margin:0 0 24px 0;font-size:11px;color:{button_color};word-break:break-all;">{url}</p>
            <p style="margin:0;font-size:12px;color:#52525b;border-top:1px solid #27272a;padding-top:16px;">{footer_note}</p>
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


def send_cred_change_email(new_email, token, base_url):
    """Rotación de credenciales del root: confirma el nuevo email + contraseña."""
    url = f"{base_url.rstrip('/')}/?cred-confirm={token}"
    subject = "Confirmá tus nuevas credenciales — ERP-LG (root)"
    footer = ('Este enlace es válido por <strong style="color:#71717a;">1 hora</strong>. '
              'Tus nuevas credenciales solo se aplicarán al confirmar desde esta casilla.')
    text_body = (
        f"Hola Root,\n\nSolicitaste cambiar el email y la contraseña de la cuenta root de ERP-LG.\n\n"
        f"Para que el cambio tenga efecto, confirmá desde este enlace (válido 1 hora):\n\n{url}\n\n"
        f"Si no solicitaste esto, ignorá este mensaje: no se aplicará ningún cambio.\n\n— Equipo SIBOTEC\n"
    )
    html_body = _render_email_html(
        'Root',
        'Solicitaste cambiar el email y la contraseña de la cuenta root. '
        'Confirmá desde el botón de abajo para que las nuevas credenciales tengan efecto.',
        'Confirmar credenciales', url, '#f59e0b', footer,
    )
    send_mail(subject=subject, message=text_body, from_email=None,
              recipient_list=[new_email], html_message=html_body, fail_silently=False)


def send_admin_creation_confirm_email(root_email, pending, token, base_url):
    """Confirmación (a la casilla del root) del alta de un admin de sistema."""
    url = f"{base_url.rstrip('/')}/?admin-confirm={token}"
    nombre = f"{pending.first_name} {pending.last_name}".strip() or pending.email
    subject = "Confirmá el alta de un admin de sistema — ERP-LG"
    footer = ('Este enlace es válido por <strong style="color:#71717a;">1 hora</strong>. '
              'Si no iniciaste este alta, ignorá este mensaje: el admin no será creado.')
    text_body = (
        f"Hola Root,\n\nSe solicitó crear un nuevo admin de sistema:\n\n"
        f"  Nombre: {nombre}\n  Email:  {pending.email}\n\n"
        f"Para autorizar el alta, confirmá desde este enlace (válido 1 hora):\n\n{url}\n\n"
        f"Recién al confirmar se creará el admin y se le enviará su email de activación.\n\n— Equipo SIBOTEC\n"
    )
    html_body = _render_email_html(
        'Root',
        f'Se solicitó crear un nuevo admin de sistema: <strong style="color:#f4f4f5;">{nombre}</strong> '
        f'(<span style="color:#a1a1aa;">{pending.email}</span>). Confirmá el alta desde el botón de abajo.',
        'Autorizar alta', url, '#f59e0b', footer,
    )
    send_mail(subject=subject, message=text_body, from_email=None,
              recipient_list=[root_email], html_message=html_body, fail_silently=False)
