# PanCoon signup and authentication email delivery

## Status as of November 10, 2026

- PanCoon's existing household account and kitchen data are unchanged.
- New self-service accounts and password-recovery emails are implemented but intentionally **disabled** in `pancoon-household-config.js` through `selfRegistrationEnabled: false`.
- Email sender/SMTP is not configured by this code. Supabase's built-in SMTP refuses email addresses that are not members of the Supabase organization team. Do **not** add family users to the developer team merely to receive sign-in emails.
- Email verification MUST stay enabled. Do not copy/paste SMTP credentials into JavaScript or GitHub.
- Email/password registration uses `auth.signUp` and requires verification before household invitation/join.
- Password recovery uses `auth.resetPasswordForEmail`; the existing PKCE callback can accept `mode=recovery` and display a password reset form.
- Existing users' password and magic-link sign-in are untouched.

## Recommended sender: Resend

Resend offers a free tier that, as checked November 10, 2026, includes 3,000 emails/month and 3 verified domains; provider pricing and usage are subject to change.

1. The owner creates or connects a Resend account: https://resend.com.
2. Add a domain they control, preferably a transactional subdomain of their own domain, and follow Resend's DNS records for SPF and DKIM. Netlify's default `*.netlify.app` subdomain is not a domain the owner controls for email DNS.
3. Verify the domain in Resend. Choose a sender like `hello@<verified-domain>`, sender name `PanCoon`.
4. Use Resend's native Supabase integration https://supabase.com/partners/resend to connect to the **PanCoon project `oimohuupigpkrxqujmbu`**, or manually configure https://supabase.com/dashboard/project/oimohuupigpkrxqujmbu/auth/smtp. Manual credentials are `smtp.resend.com`, port `465`, username `resend`, password **private Resend API key**. Never commit or share the key in chat.
5. Ensure Supabase Auth keeps email confirmation ON; set Site URL `https://pantryraccoon.netlify.app` and allow `https://pantryraccoon.netlify.app/pancoon-auth.html` and `https://pantryraccoon.netlify.app/pancoon-auth.html?mode=recovery` as redirect URLs in https://supabase.com/dashboard/project/oimohuupigpkrxqujmbu/auth/url-configuration. Set conservative email rate limits.
6. Verify delivery with a controlled test account email, in the SAME browser that requested the email. The confirmation must return to the PanCoon callback and the email/password login must work. Test recovery end-to-end as well.
7. ONLY after successful verification, change `selfRegistrationEnabled` to `true` and deploy the site to production.
8. Each family member registers with their own email/password, confirms their address, then joins the household with the owner's one-time seven-day kitchen invitation code. Do not preassign them to the Supabase developer organization.
9. Verify with separate devices: each family member sees the same Talbot Kitchen after connecting; no access to any household without an invitation; recipe zines display privately.

## Notes

- The repository is public and only the Supabase URL/publishable key are safe to expose. SMTP passwords and API tokens must stay solely in Supabase/Resend's protected settings.
- Neither email account has been created by this change, and no mail was sent.
- The connected Supabase actions here do not expose SMTP configuration or an existing sender's credentials. A domain-owner action is required to validate DNS and consent to a provider's service.
- Supabase docs: https://supabase.com/docs/guides/auth/auth-smtp
- Resend SMTP docs: https://resend.com/changelog/smtp-service
