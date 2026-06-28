---
topic: "$research supplemental -- pull actual css from their page if possible and generalize the styles"
slug: steno-brand
researched: 2026-06-28
---

# Primary Sources — $research supplemental -- pull actual css from their page if possible and generalize the styles

| ID | Type | Locator | Accessed | What it contributed |
|----|------|---------|----------|---------------------|
| S1 | codebase | `packages/web/src/styles/style-guide.md` | 2026-06-28 | Existing Steno token baseline used by the project. |
| S2 | codebase | `packages/web/src/index.css` | 2026-06-28 | Existing runtime variables and utility aliases in-app. |
| S3 | web | `https://www.steno.com/` | 2026-06-28 | HTML stylesheet includes the module list used by the homepage. |
| S4 | web | `https://5816813.fs1.hubspotusercontent-na1.net/hubfs/5816813/hub_generated/template_assets/1/71527026195/1782499268068/template_styles.min.css` | 2026-06-28 | Shared template stylesheet baseline. |
| S5 | web | `https://5816813.fs1.hubspotusercontent-na1.net/hubfs/5816813/hub_generated/module_assets/1/161715115372/1741975205604/module_u4m-hero-v2.min.css` | 2026-06-28 | Live hero-module typography, eyebrow/button conventions, and global module rem behavior (`html{font-size:1px}`). |
| S6 | web | `https://5816813.fs1.hubspotusercontent-na1.net/hubfs/5816813/hub_generated/module_assets/1/161714631548/1741975203605/module_u4m-cta-row-v2.min.css` | 2026-06-28 | Live CTA-row container gradient + CTA text/button treatment. |
| S7 | web | `https://5816813.fs1.hubspotusercontent-na1.net/hubfs/5816813/hub_generated/module_assets/1/71525845584/1741975148167/module_u4m-cards.min.css` | 2026-06-28 | Card layout and token-like typography/border/shadow patterns. |
| S8 | web | `https://5816813.fs1.hubspotusercontent-na1.net/hubfs/5816813/hub_generated/template_assets/1/71527026195/1782499268068/template_styles.min.css` | 2026-06-28 | Confirms baseline gradient and dark-to-accent color usage for controls. |

## Excerpts

### S3 — steno.com stylesheet references
```html
<link rel="stylesheet" href="https://5816813.fs1.hubspotusercontent-na1.net/hubfs/5816813/hub_generated/template_assets/1/71527026195/1782499268068/template_styles.min.css">
<link rel="stylesheet" href="https://5816813.fs1.hubspotusercontent-na1.net/hubfs/5816813/hub_generated/module_assets/1/161693447846/1741975199266/module_u4m-header-v2.min.css">
<link rel="stylesheet" href="https://5816813.fs1.hubspotusercontent-na1.net/hubfs/5816813/hub_generated/module_assets/1/161715115372/1741975205604/module_u4m-hero-v2.min.css">
<link rel="stylesheet" href="https://5816813.fs1.hubspotusercontent-na1.net/hubfs/5816813/hub_generated/module_assets/1/161714631548/1741975203605/module_u4m-cta-row-v2.min.css">
```

### S3 — route-level variant
```html
<link rel="stylesheet" href="https://5816813.fs1.hubspotusercontent-na1.net/hubfs/5816813/hub_generated/module_assets/1/166501799593/1741975209540/module_u4m-Embed.min.css">
<link rel="stylesheet" href="https://5816813.fs1.hubspotusercontent-na1.net/hubfs/5816813/hub_generated/module_assets/1/71525845534/1741975132681/module_u4m-accordion.min.css">
```

### S5 — hero module excerpts
```css
html{font-size:1px}
.eyebrow{color:#a18050;color:#fff!important;display:block;font-family:Apercu;font-size:12rem;font-weight:400;letter-spacing:1rem;margin-bottom:15rem;opacity:.8;text-transform:uppercase}
div.copy div.upper .heading{font-family:Editor;font-size:70rem;font-weight:500;letter-spacing:.25rem;line-height:1.2;margin-bottom:20rem;margin-top:0}
div.copy div.upper .heading{font-size:38rem;margin-bottom:20rem}
.button{background-color:#a18050;border:0;border-radius:50rem;-webkit-box-shadow:0 1rem 12rem 0 rgba(25,61,61,.1);box-shadow:0 1rem 12rem 0 rgba(25,61,61,.1);color:#fff;cursor:pointer;display:inline-block;font-family:Apercu;font-size:14rem;font-weight:400;letter-spacing:.25rem;line-height:1.2;margin:20rem 0;padding:15rem 40rem 12rem;text-align:center;text-decoration:none;text-transform:uppercase;-webkit-transition:.1s ease-in;transition:.1s ease-in}
```

### S6 — cta-row module excerpts
```css
.u4m-cta-row{background-attachment:fixed;background-color:linear-gradient(-45deg,#383a81,#241743 50%);background-position:50%;background-repeat:no-repeat;background-size:cover;border-radius:10rem;margin:100rem auto;max-width:1440rem;padding:80rem 0;width:calc(100% - 40rem)}
.u4m-cta-row div.inner div.copy .heading{font-family:Editor;font-size:48rem;font-weight:400;letter-spacing:.25rem;line-height:1.2;margin-bottom:20rem}
.u4m-cta-row div.inner div.copy p.text{font-family:Apercu;font-size:18rem;font-weight:100;letter-spacing:.25rem;line-height:1.6;margin-bottom:20rem}
.copy div.cta a{background:#fff;border:1rem solid #a18050;border-radius:50rem;color:#a18050;margin-bottom:0;min-width:200rem;padding:20rem 35rem;position:relative;text-align:center;text-transform:uppercase}
```

### S7 — cards module excerpts
```css
.u4m-cards .heading{font-family:Editor;font-size:48rem;font-weight:400;letter-spacing:.25rem;margin-bottom:20rem;line-height:1.2;text-align:center}
.u4m-cards .wrapper div.card{background-color:#fff;border-radius:10rem;-webkit-transition:.333s;transition:.333s ease;border:1rem solid #a18050;-webkit-box-shadow:0 5rem 25rem 0 rgba(25,61,61,.2);box-shadow:0 5rem 25rem 0 rgba(25,61,61,.2)}
.u4m-cards .wrapper div.card div.content span.type{font-family:Apercu;font-size:13rem;line-height:1.6;letter-spacing:.35rem;font-weight:100;color:#a18050;text-transform:uppercase}
```

### S4 — template styles excerpts
```css
.graphai-cta-class {
  border-color: #193d3d;
  box-shadow: rgba(25, 61, 61, 0.2) 0px 5px 25px 0px;
}
.graphai-link-class:hover,
.graphai-link-class:focus,
.graphai-link-class:active {
  background-color: #7848df;
}
```
