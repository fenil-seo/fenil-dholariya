# Editing website content

Open `/admin` and choose a page. The section list follows the website's sections.
On mobile, use **Choose a section**. Select **Content** to edit or **Preview** to
see the selected section with unsaved changes. Use **Save changes** to publish
page edits, or **Discard changes** to restore the saved page.

## Page sections

- Home includes Header / navigation, Opening introduction, Working principles,
  Selected case, How I work, Find a starting point, Services, More selected work,
  The work gallery, A useful fit, and Start with context.
- About, Work, Services, Gallery and Insights use the same section workflow.
- **Add section** offers text, image, video and call to action layouts. Move,
  hide or remove sections with the buttons above their fields. Removed built-in
  sections can be restored from Add section; their saved copy is retained.
- Headings support visual bold/italic editing and Shift+Enter for line breaks.
- Header edits apply across pages. Footer is a separate shared editor.
- SEO remains in the SEO tab, including page robots directives, Open Graph and
  JSON-LD. Sitewide robots.txt is managed in Home SEO.

## Shared services

Select the Services section in either Home or Services, then **Add service**.
Edit the name, introduction, description, scope and enquiry link. New services
start hidden. Turn on **Show on Services page** to publish, and **Also show on
Home** to include the same service in Home's service list. Save changes above.

The service's link name is generated from its initial name and stays stable after
saving. Move services to change their order on both pages. Removing a service
removes it from both lists. If another session saves the service list first, the
editor keeps your draft and offers **Load latest services**. Loading the latest
list discards the service draft after confirmation and preserves other page edits.

## Gallery sections and captures

Use **Add gallery section** to create a section. Enter its heading, short filter
label and description, then **Save section**. In **Gallery sections and captures**,
choose that section and use **Add capture to this section**. Each capture has an
image, alt text, caption, badge, order, pin and highlight controls. A capture's
section selector moves it to another gallery section.

Gallery dialogs have their own Save and Cancel buttons. Those saves publish
immediately; the page toolbar saves page copy and page layout only. A section
containing captures cannot be deleted until its captures are moved or deleted.
Section reordering is saved as one database operation.

Use **Add content block** for an additional text, image, video or call to action
block around the gallery. Its publication follows the page Save changes button.

## Media and stored content

Content image controls include **Display as: Image / Video**. Choose **Video**,
paste a YouTube, YouTube Shorts, Instagram Reel or direct MP4 / WebM link, and
use **Preview video** to check the player. Save the page, capture, case study or
article to publish it. Switching to **Image** restores the saved image; neither
choice deletes the other URL.

This applies to page section images, Gallery captures, case study covers and
article card / hero images. Logos, author avatars, video posters and social
sharing images remain image controls. Added image and video content blocks use
the same selector. Page previews show a static video placeholder; the separate
Preview video dialog contains the player.

Third party playback depends on the video being public and available for
embedding. Each published player includes a link to open the source video.

Choose existing published media from the picker, or paste a hosted HTTPS URL.
New media files must be hosted or deployed to `assets` before selection. These
editors do not upload files to a storage provider.

Existing settings and captures remain authoritative. The shared service catalog
is initialized from the approved service template and saved service settings
when first opened, then stored when an owner edits it. Public pages read the
catalog server-side. No additional database setup is needed for page sections or
the shared service catalog.

`npm test` covers section rendering and validation, shared services, stale save
protection, Gallery ordering, previews and the existing CMS/SEO/contact tests.
