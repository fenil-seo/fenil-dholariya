# Contact email alerts

The website saves each contact request before attempting an owner email alert. Alerts go only to **fenil.seo@gmail.com** and are sent by that same Gmail account. The email contains the lead ID, visitor name and email, company, selected services, website, market, budget and currency, preferred start, location/time zone, source page, full project brief and private admin link. Private admin notes are excluded. A valid visitor email becomes Reply-To, so replying opens a conversation with the visitor.

This setup uses the existing free Google account. No paid email subscription, custom domain, SMS service or additional notification account is required. It remains subject to Gmail's account and sending restrictions. It is **not active until the owner adds the secret in Vercel and redeploys**.

## Owner activation

1. Sign into **fenil.seo@gmail.com** in your Google account settings.
2. Turn on **2-Step Verification** under Security. Open [App Passwords](https://myaccount.google.com/apppasswords) and create a password named, for example, `Portfolio contact alerts`.
3. Copy Google's generated **16-character App Password**. The website accepts its grouped spaces. Never use your ordinary Google password, paste the secret into chat, commit it, or put it in browser JavaScript.
4. Open this site's Vercel project, then **Settings > Environment Variables**. Add **GMAIL_APP_PASSWORD** for **Production**, with the generated App Password as its value. No SMTP host, sender or recipient variables are needed.
5. Redeploy the production project so the new server environment takes effect. The local code alone does not activate production alerts.
6. Sign into `/admin#leads`. Check that notification setup is configured and send a clearly labelled test email. Confirm that the message arrives in the correct Gmail inbox, then confirm the phone notification. The test control does not create a customer lead.

Google requires 2-Step Verification for App Passwords. They may be unavailable with Advanced Protection, security-key-only verification or some managed accounts. Google prefers OAuth where it is supported. Changing the Google account password revokes its App Passwords; generate a replacement and update Vercel if that happens. [Google App Password documentation](https://support.google.com/accounts/answer/185833?hl=en).

To pause alerts while retaining lead storage, set **LEAD_EMAIL_NOTIFICATIONS_ENABLED=false** in Vercel and redeploy. Remove the switch or set it to `true` to resume once the App Password is configured. Removing or revoking the App Password disables usable SMTP credentials; saved requests still remain in admin.

## Gmail phone notifications

The phone receives Gmail app notifications. The website does not send to a telephone number, and there is no SMS, WhatsApp or voice-call charge.

For Android:

1. Sign into **fenil.seo@gmail.com** in the Gmail app.
2. Allow Gmail notifications in Android's app notification settings.
3. In Gmail, open **Menu > Settings > fenil.seo@gmail.com > Email notifications**, and select notifications for all new mail where available. Ensure **Sync Gmail** is enabled.
4. If you create a Gmail filter and a **Website leads** label, open **Manage labels > Website leads**, enable label sync, then enable that label's notifications and sound. Avoid a high-priority-only setting if every lead needs an alert.

Google's [Android notification instructions](https://support.google.com/mail/answer/1075549?co=GENIE.Platform%3DAndroid&hl=en) explain both account and label settings.

For iPhone, allow Gmail notifications in iOS settings, sign into the correct account, then open Gmail **Settings > Email notifications** and select the required notification level. Check phone Focus/Do Not Disturb settings if an inbox message arrives silently. Follow [Google's iPhone instructions](https://support.google.com/mail/answer/1075549?co=GENIE.Platform%3DiOS&hl=en).

Both Gmail delivery and phone alerts must be tested on the owner's actual account and device. An SMTP acceptance response cannot prove that a phone displayed a notification. Inbox categories, spam filtering, device settings, internet access and sync can affect alerts.

## Delivery status and retries

The admin inbox records the email notification result separately from the lead:

| Status | Meaning |
| --- | --- |
| Pending | An attempt has been claimed or has not completed. |
| Sent | Gmail accepted the message for the fixed owner address. Inbox placement and phone display are not confirmed. |
| Failed | Sending failed or exceeded its time limit. The lead is still saved. |
| Not configured | A usable `GMAIL_APP_PASSWORD` has not been configured. |
| Disabled | The explicit notification switch is off. |

Use the selected lead's notification action to retry after correcting a configuration or transient failure. Concurrent duplicate retry clicks are blocked; an old pending claim can be retried after its recovery interval. Resending a previously accepted message requires explicit confirmation. There is no scheduled background retry service.

An SMTP timeout can occur after Gmail has already accepted a message but before the site receives confirmation. Retrying such an uncertain outcome can produce a duplicate alert. Lead storage is the authoritative request record.

## Limits and troubleshooting

Consumer Gmail can block sending after more than **500 messages in one day**; other mail sent from this same account counts too. Google says sending generally resumes within **1 to 24 hours** after its daily-limit error. There is no promise of unlimited or uninterrupted free delivery. [Google sending limits](https://support.google.com/mail/answer/22839?hl=en-GB).

- **Setup still says Not configured:** confirm the secret is in this project's Production environment and that the deployment was rebuilt after the change.
- **Authentication failed:** confirm the App Password belongs to `fenil.seo@gmail.com`, 2-Step Verification remains enabled and the password has not been revoked. Replace the App Password if necessary.
- **Timeout or unavailable:** the request remains saved. Check Gmail/account availability, then retry from admin. Repeated failures need investigation before resending many messages.
- **Sent but no visible email:** check Inbox, Spam, All Mail and Sent in the correct account. Gmail acceptance does not guarantee a new inbox banner.
- **Email arrives but the phone is silent:** check the Gmail account's notification level, device permissions, sync, labels and Focus/Do Not Disturb, then repeat a test on the device.

## Implementation and verification

`lib/lead-notifications.js` uses Nodemailer over **smtp.gmail.com:465**, with TLS certificate validation, Gmail SNI and TLS 1.2 or newer. The SMTP sender, envelope recipient and destination are fixed in server code. Untrusted visitor text is confined to a plain-text body and a sanitized subject; invalid Reply-To values are omitted. SMTP diagnostics, provider errors and credentials are not exposed through settings or notification results.

The send attempt has a **6.5-second overall deadline**, with shorter connection, greeting and idle-socket limits. A tracked TLS socket is destroyed on deadline and completion, including a pending lookup or TLS handshake, because simply closing Nodemailer's nonpooled transport does not cancel a busy connection. Vercel supports outbound SMTP except port 25, and the send is awaited after storage. [Nodemailer SMTP timeouts](https://nodemailer.com/smtp), [Vercel SMTP behavior](https://vercel.com/kb/guide/serverless-functions-and-smtp).

Run `npm test` to exercise notification configuration, message safety, delivery results, timeouts, cleanup and save-before-send behavior with injected fixtures. These tests do not load production credentials or send real email.
