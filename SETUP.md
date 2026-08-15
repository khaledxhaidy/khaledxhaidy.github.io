# دعوة زفاف هايدي و خالد — setup

A one-page wedding invitation. Arabic (Egyptian) and English with a toggle,
five switchable skins, a wax-seal envelope intro, live countdown, RSVP with
companions, and a guestbook.

```
index.html                 the whole invitation — edit CONFIG near the bottom
assets/fonts.css           Amiri + Cairo + Cormorant, embedded (generated)
assets/*.jpg               web-sized photos (generated)
source-photos/             the original WhatsApp files
backend/Code.gs            Apps Script that stores RSVPs in a Google Sheet
tools/prepare-assets.ps1   regenerates assets/*.jpg from source-photos/
tools/fetch-fonts.mjs      re-downloads and embeds the fonts
tools/build.mjs            one-file build -> dist/invitation.html
tools/serve.mjs            local preview:  node tools/serve.mjs 5199
```

---

## 1. Fill in the details

Everything editable is in the `CONFIG` block near the bottom of `index.html`.

| Field | Currently |
|---|---|
| `bride` / `groom` | هايدي / خالد · Haidy / Khaled |
| `monogram` | pressed into the wax seal |
| `startsAt` / `endsAt` | **Sat 19 Sep 2026, 7:00 PM → 2:00 AM** |
| `venue` | قاعة كابيتال — طلخا، محافظة الدقهلية |
| `mapUrl` | a pin on the hall |
| `whatsapp` | **empty** — see below |
| `endpoint` | **empty** — see step 2 |
| `hashtag` | `#هايدي_وخالد` |
| `defaultLang` | `ar` |
| `defaultSkin` | `classic` · `arabesque` · `floral` · `blush` · `minimal` |

Every visible sentence lives in the `T` object right below CONFIG, in both
languages. Change wording there and it changes everywhere.

### What `whatsapp` is for

Only one thing: it is the **fallback for RSVPs when `endpoint` is empty.**
In that mode a guest's reply is saved in their own browser and WhatsApp opens
pre-filled with their answer addressed to that number, so the reply still
reaches a human. Once you do step 2, replies go to the Sheet and the number is
no longer needed — leave it empty or keep it as a contact-for-questions.

---

## 2. Make the RSVPs go somewhere (about 5 minutes)

1. Create a Google Sheet **on the couple's own account** — the replies land
   there, so it should not be your account.
2. Copy the Sheet ID from its URL: the long string between `/d/` and `/edit`.
3. In that Sheet: **Extensions → Apps Script**.
4. Delete what's in the editor, paste `backend/Code.gs`, and put the Sheet ID
   between the quotes on the `var SHEET_ID = '';` line.
5. **Deploy → New deployment → Web app** · *Execute as:* **Me** ·
   *Who has access:* **Anyone**.
6. Authorise it. Google warns that the app is unverified — it is your own
   script, so continue.
7. Copy the `/exec` URL and paste it into `endpoint` in `index.html`.

Two tabs, `RSVP` and `Wishes`, appear automatically on the first submission.
RSVPs are write-only from the page — the script refuses to serve them back, so
no guest can read the guest list. Only the guestbook is public.

---

## 3. Put it online

The invitation is plain HTML with no build step, so any static host works.
**A published Claude artifact is not suitable for guests** — opening that link
sends anyone without a Claude login to a sign-in page. Use one of these:

### GitHub Pages

```bash
git add -A
git commit -m "Wedding invitation"
gh repo create haidy-khaled-invitation --public --source=. --push
```

Then on the repo: **Settings → Pages → Source: Deploy from a branch →
`main` / `root` → Save**. The link appears in a minute at
`https://<user>.github.io/haidy-khaled-invitation/`.

Note that a GitHub Pages site is **public** — anyone with the address can open
it, and the photos are readable by anyone who guesses the URL. That is normal
for wedding invitations, but it is worth knowing before you push.

### Netlify Drop — no account, no git

Drag the project folder onto <https://app.netlify.com/drop>. It returns a link
immediately. The quickest option, and it gives a private-ish random URL.

### Cloudflare Pages / Vercel

Connect the repo, deploy on push. Both have free tiers.

---

## One-file version

```
node tools/build.mjs
```

Writes `dist/invitation.html` with the fonts and photos embedded — a single
file you can host anywhere, email, or open straight off a phone.

---

## Regenerating assets

```
powershell -File tools/prepare-assets.ps1   # photos, after editing the map inside
node tools/fetch-fonts.mjs                  # fonts (needs network, run once)
```

---

## Notes

- The page commits to a printed-invitation look rather than following the
  phone's dark mode; the five skins are the themes and the guest picks one.
- Fonts are embedded as data URIs. Amiri, Cairo and Cormorant Garamond are all
  under the SIL Open Font License, which permits this.
- Verified in Chrome at desktop width. Worth a look on a real phone before the
  link goes out.
