# MyKart UI Design Specification

**Source:** Figma frame analysis — extracted from imported React code and design screenshots.
**Date:** 2026-08-24
**Stack:** Next.js App Router · React + TypeScript · Tailwind CSS v4 · shadcn/ui · Framer Motion · NestJS · PostgreSQL + Prisma

---

## 1. Design Philosophy and Visual Style

MyKart is a curated, design-forward e-commerce marketplace. The aesthetic is **clean, editorial, and confident** — influenced by premium lifestyle brands rather than high-volume discount retail. Key characteristics:

- Generous white space; content breathes
- Strong typographic hierarchy using two typefaces (display + body)
- A single vivid brand accent (`#ff3b00`) on a near-white and true-white background palette
- Photography is always warm, product-focused, and high quality (neutral/beige backdrops)
- Cards and containers use soft rounding and subtle 1px borders rather than heavy shadows
- Text and icons in near-black (`#111`) with secondary text in warm grey (`#666662`)

---

## 2. Exact Colors and Color Roles

| Token name (suggested) | Hex / RGBA | Role |
|---|---|---|
| `--color-brand` | `#ff3b00` | Primary action, logo icon bg, badges, promo accents, CTA buttons |
| `--color-brand-muted` | `rgba(255,59,0,0.07)` | Pill badge backgrounds (e.g. "Spring Collection Drop") |
| `--color-foreground` | `#111111` | Primary text, headings, icon strokes |
| `--color-muted` | `#666662` | Secondary / descriptive text, placeholder text, icon strokes on inputs |
| `--color-surface` | `#ffffff` | Page background, card backgrounds, nav bar bg |
| `--color-surface-warm` | `#faf9f6` | Search bar bg, input field bg, footer bg, off-white page sections |
| `--color-border` | `#ebeae6` | All 1px borders on cards, inputs, nav, footer, dividers |
| `--color-dark-surface` | `#111111` | Deals banner background (dark promo section) |
| `--color-dark-text` | `rgba(255,255,255,0.8)` | Body text on dark surfaces |
| `--color-star` | `#FFB000` | Star rating icons (stroke, not fill) |
| `--color-overlay` | `rgba(17,17,17,0.3)` | Image overlays on category cards |

**No gradients** are used. All backgrounds are flat.

---

## 3. Typography

### Font Families

| Family | Weights used | Role |
|---|---|---|
| **Outfit** (Google Fonts, variable) | ExtraBold (800), Bold (700), SemiBold (600) | Display, headings, nav labels, button labels, stat numbers, footer section headings |
| **Geist** (Google Fonts, variable) | Regular (400), SemiBold (600), Bold (700) | Body copy, search placeholder, meta text, secondary labels, badge text, input placeholders |

Both are variable fonts from Google Fonts. Load via CSS2 `@import` with axis ranges:
- Outfit: `family=Outfit:wght@600;700;800`
- Geist: `family=Geist:wght@400;600;700`

### Type Scale (from Figma code, exact values)

| Usage | Family | Weight | Size | Line-height |
|---|---|---|---|---|
| Hero heading | Outfit | ExtraBold 800 | 60px | 1.1 |
| Deals banner heading | Outfit | ExtraBold 800 | 44px | normal |
| Newsletter heading | Outfit | ExtraBold 800 | 36px | normal |
| Section heading (categories, testimonials) | Outfit | Bold 700 | 32px | normal |
| Stat number (150k+, 4.9/5) | Outfit | Bold 700 | 24px | normal |
| Category card name | Outfit | SemiBold 600 | 24px | normal |
| Logo wordmark | Outfit | ExtraBold 800 | 22px | normal |
| Footer logo wordmark | Outfit | ExtraBold 800 | 20px | normal |
| Footer section headings (Shop, Company, Support) | Outfit | Bold 700 | 15px | normal |
| Button label | Outfit | SemiBold 600 | 15px | normal |
| Testimonial reviewer name | Outfit | SemiBold 600 | 15px | normal |
| Nav link labels (Account, Cart) | Outfit | SemiBold 600 | 14px | normal |
| "View All Categories" link | Outfit | SemiBold 600 | 14px | normal |
| Hero body copy | Geist | Regular 400 | 18px | 1.6 |
| Section subtitle | Geist | Regular 400 | 16px | normal |
| Testimonial quote | Geist | Regular 400 | 16px | 1.6 |
| Newsletter subtitle | Geist | Regular 400 | 16px | 1.5 |
| Deals banner body | Geist | Regular 400 | 16px | 1.6 |
| Search placeholder | Geist | Regular 400 | 14px | normal |
| Input placeholder | Geist | Regular 400 | 14px | normal |
| Footer body / nav links | Geist | Regular 400 | 14px | 1.6 |
| Category card count | Geist | Regular 400 | 14px | normal |
| Stat label | Geist | Regular 400 | 13px | normal |
| Testimonial reviewer title | Geist | Regular 400 | 13px | normal |
| Deals promo label (LIMITED TIME PROMO) | Geist | Bold 700 | 14px | normal, uppercase |
| Promo pill text (SPRING COLLECTION DROP) | Geist | SemiBold 600 | 12px | normal, uppercase |
| Cart badge count | Geist | Bold 700 | 9px | normal |
| Footer legal / payment labels | Geist | Regular 400 / Bold 700 | 13px / 10px | normal |

---

## 4. Spacing System

The design uses a **base-8 spacing system** with some 4px and 12px steps:

| Value | Usage |
|---|---|
| 2px | Star icon gaps |
| 4px | Section heading/subtitle gap, small internal gaps |
| 6px | Promo pill vertical padding |
| 8px | Logo group gap, social icon gap, payment badge gap |
| 12px | Search bar icon gap, testimonial avatar gap, newsletter input/button gap, social icon row gap, footer link gaps |
| 16px | Button group gap (primary+secondary), hero content gap, section gap within cards, footer column gap, promo pill horizontal padding |
| 20px | Input horizontal padding, footer brand column gap |
| 24px | Category grid gap, testimonial grid gap, footer legal link gap, category card padding |
| 28px | Primary button horizontal padding |
| 32px | Stats block gap, testimonial card padding, footer brand gap |
| 40px | Testimonials section block gap |
| 44px | Search bar input height |
| 48px | Footer bottom padding |
| 52px | Newsletter input height |
| 64px | Hero side-by-side gap, featured categories vertical padding (py), deals banner frame padding |
| 80px | Horizontal page padding (px) on all full-width sections, hero padding |
| 96px | Newsletter section vertical padding (py) |

---

## 5. Border Radius

| Value | Applied to |
|---|---|
| 4px | Payment method badges in footer |
| 6px | Footer logo icon container |
| 8px | Primary button, secondary button, input fields, logo icon container (top nav) |
| 16px | Product cards (implied from category card), testimonial cards |
| 18px | Social icon circles in footer |
| 24px | Hero image container, deals banner inner |
| 100px (pill) | Search bar, promo announcement pill |

---

## 6. Borders and Shadows

**Borders:** All borders are `1px solid #ebeae6`. No exceptions visible. Borders are applied via an absolutely-positioned full-inset `<div>` with `pointer-events-none` to avoid affecting layout — this is an important pattern from the Figma code.

**Shadows:** No `box-shadow` values appear anywhere in the Figma design. Depth is communicated through background color contrast and border lines only.

**Secondary button border:** `1.5px solid #111111` (slightly heavier than default card borders).

---

## 7. Container Widths and Grid Structure

- **Page max width:** `1280px` (inferred from footer SVG divider `width="1280"`)
- **Horizontal padding:** `px-[80px]` (80px each side) on all full-width sections
- **Effective content width:** 1120px at 1280px viewport

### Grid patterns observed:

| Section | Grid |
|---|---|
| Hero | 2-column flex: `flex-[1_0_0]` (text) + `520px` fixed (image) with `64px` gap |
| Featured Categories | 4-column flex with equal `flex-[1_0_0]` columns, `24px` gap, `320px` height per card |
| Trending Products | 4-column grid, equal widths, `24px` gap (inferred from image-3) |
| Deals Banner | 2-column: `flex-[1_0_0]` (text, `p-[64px]`) + `540px` fixed (image), inside a `rounded-[24px]` dark container |
| Testimonials | 3-column flex, equal `flex-[1_0_66px]`, `24px` gap |
| Newsletter | Centered single column, `640px` max-width content block |
| Footer | 4-column flex: `280px` (brand) + `160px` × 3 (Shop, Company, Support), space-between |

---

## 8. Navbar / Header / Search / Navigation

**Component name:** `TopNavBar`

**Layout:** Full-width flex row, `justify-between`, `px-[80px]`, `bg-white`. 1px bottom border `#ebeae6` via inset absolute div.

**Left — Logo group:**
- Orange square icon container: `32×32px`, `bg-[#ff3b00]`, `rounded-[8px]`
- Shopping cart icon inside: `18×18px`, white stroke
- Wordmark: `"mykart"`, Outfit ExtraBold, `22px`, `#111`, 8px gap from icon

**Center — Search bar:**
- Width: `440px`, height: `44px`
- Background: `#faf9f6`, border-radius `100px` (pill shape)
- Padding: `px-[16px]`, `gap-[12px]`
- Left icon: `18×18px` search SVG, stroke `#666662`
- Placeholder: `"Search products, brands, and categories..."`, Geist Regular 14px, `#666662`
- No visible border on search bar (relies on bg color contrast)

**Right — Actions group:**
- `gap-[24px]` between Account and Cart
- **Account:** user icon `20×20px` (stroke `#111`) + "Account" label, Outfit SemiBold 14px `#111`, `gap-[8px]`
- **Cart:** shopping-bag icon `20×20px` (stroke `#111`) + orange badge `16×16px` `bg-[#ff3b00]` `rounded-[8px]` positioned `top-[-6px] right-[-6px]` with count "3" in Geist Bold 9px white + "Cart" label, Outfit SemiBold 14px `#111`, `gap-[8px]`

**No secondary navigation bar** (category nav, breadcrumb, etc.) is present in the Figma frames provided.

**Responsive behavior:** Not specified in Figma. Assume hamburger menu on mobile.

---

## 9. Buttons, Inputs, Dropdowns, Cards, Badges

### Primary Button
- Background: `#ff3b00`
- Padding: `px-[28px] py-[14px]`
- Border-radius: `8px`
- Label: Outfit SemiBold, 15px, white
- No border, no shadow

### Secondary Button
- Background: transparent
- Border: `1.5px solid #111`
- Padding: `px-[24px] py-[14px]`
- Border-radius: `8px`
- Label: Outfit SemiBold, 15px, `#111`

### Tertiary / Ghost Link
- No container, no border
- Used as plain text with Outfit SemiBold, 15px, white (e.g. "View Terms & Conditions" in deals banner)

### Input Field (Newsletter)
- Height: `52px`
- Background: `#faf9f6`
- Border: `1px solid #ebeae6`
- Border-radius: `8px`
- Padding: `px-[20px]`
- Placeholder: Geist Regular, 14px, `#666662`

### Search Bar (see Section 8)
- Pill shape `border-radius: 100px`
- Same background `#faf9f6`, no border

### Announcement / Promo Pill Badge
- Background: `rgba(255,59,0,0.07)`
- Border-radius: `100px`
- Padding: `px-[12px] py-[6px]`
- Text: Geist SemiBold, 12px, `#ff3b00`, uppercase, with ⚡ emoji prefix

### Cart Item Count Badge
- `16×16px`, `bg-[#ff3b00]`, `rounded-[8px]`
- Text: Geist Bold, 9px, white

### Product Badge (on product cards)
- `bg-[#ff3b00]`, `rounded` (small), absolute top-left of image
- Text: Geist/Outfit SemiBold, ~12px, white (e.g. "Best Seller", "New Drop", "Handcrafted", "Limited Run", "Staff Pick", "Sale", "Sustainable")

### Star Rating
- 5 stars, each `16×16px`, `gap-[2px]`
- Stroke: `#FFB000`
- Not filled — outline stroke style

### Testimonial Card
- Background: white
- Border: `1px solid #ebeae6`
- Border-radius: `16px`
- Padding: `32px`
- Avatar: `40×40px`, `rounded-[20px]` (circle)
- Layout: flex column, `justify-between` (quote top, author bottom)
- Author block has `pt-[24px]`, gap `12px` between avatar and name stack

---

## 10. Product Card Design

Observed from the "Trending Right Now" section (image-3).

**Layout:** Vertical card, equal-width columns in a 4-column grid.

**Image area:**
- Aspect ratio approximately 1:1 or slightly taller
- White/neutral background photography
- Rounded top corners (card has `rounded-[16px]` overall)
- Badge positioned absolute top-left, e.g. `top-[12px] left-[12px]`, orange pill with white text

**Below image:**
- Star row: 5 stars at 16px, `#FFB000` stroke, followed by review count in parentheses, Geist Regular ~13px, `#666662`
- Product name: Outfit Bold or SemiBold, ~16px, `#111`, 1–2 lines
- Price: Outfit Bold, ~18–20px, `#111`. If discounted, original price shown struck-through in smaller Geist Regular `#666662` beside it
- "Add to Cart" button: full-width, secondary button style (border `1px solid #111`, transparent bg, Outfit SemiBold, 14–15px, `#111`, `rounded-[8px]`)

**Section header:**
- Title: Outfit Bold, 32px, `#111`
- Subtitle: Geist Regular, 16px, `#666662`, gap `4px` below title

---

## 11. Homepage Layout (Sections, top to bottom)

1. **TopNavBar** — full width, white, sticky (assumption), 1px border-bottom
2. **HeroBanner** — full width, white, `p-[80px]`, 2-col layout
3. **FeaturedCategories** — full width, white, `px-[80px] py-[64px]`, 4-col grid
4. **TrendingProducts** ("Trending Right Now") — full width, white, `px-[80px] py-[64px]` (inferred), 4-col × 2-row product grid
5. **DealsBanner** — full width, `px-[80px]` outer, dark `#111` inner rounded box
6. **TestimonialsSection** — full width, white, `p-[80px]`, 3-col cards
7. **NewsletterSection** — full width, white, `py-[96px]`, centered 640px content, 1px border
8. **Footer** — full width, `bg-[#faf9f6]`, `pt-[80px] pb-[48px] px-[80px]`

---

## 12. Hero Banner

**Component:** `HeroBanner`

**Container:** `bg-white`, `p-[80px]`, `gap-[64px]`, flex row, items centered

**Left column (`flex-[1_0_0]`):**
- Promo pill: `rgba(255,59,0,0.07)` background, `px-[12px] py-[6px]`, Geist SemiBold 12px `#ff3b00` uppercase — "⚡ Spring Collection Drop"
- H1: Outfit ExtraBold 800, 60px, `#111`, line-height 1.1 — "Elevate your everyday essentials"
- Subhead: Geist Regular, 18px, `#666662`, line-height 1.6
- Button row: Primary ("Shop Collection") + Secondary ("Learn More"), `gap-[16px]`
- Stats row: `pt-[24px]`, `gap-[32px]`, 3 stat blocks
  - Each stat: number (Outfit Bold 24px `#111`) + label (Geist Regular 13px `#666662`), `gap-[2px]`
  - Stats: "150k+ Happy Customers", "4.9/5 Average Rating", "24/7 Expert Support"

**Right column:**
- `520×520px` square image container, `rounded-[24px]`, `overflow-clip`
- Product photography on warm beige background

---

## 13. Featured Categories Section

**Component:** `FeaturedCategories`

**Container:** `px-[80px] py-[64px]`, flex column, `gap-[32px]`

**Header row:** flex, `justify-between`, items centered
- Left: Title (Outfit Bold 32px `#111`) + subtitle (Geist Regular 16px `#666662`), `gap-[4px]`
- Right: "View All Categories →" link (Outfit SemiBold 14px `#111` + 16px arrow icon)

**Grid:** 4 equal-width image cards, `gap-[24px]`, each `flex-[1_0_0]`

**Category card:**
- Height: `320px`, `rounded-[16px]`, `overflow-clip`
- Full-bleed background image (`object-cover`)
- Dark overlay: `rgba(17,17,17,0.3)` absolute fill
- Text bottom-left, `p-[24px]`
- Category name: Outfit SemiBold 24px, white
- Count: Geist Regular 14px, `rgba(255,255,255,0.8)`
- Text gap: `4px`

---

## 14. Product Listing Layout ("Trending Right Now")

**Section header:**
- Title: Outfit Bold 32px `#111` — "Trending Right Now"
- Subtitle: Geist Regular 16px `#666662` — "Our community's favorite pieces..."

**Grid:** 4 columns × 2 rows visible, `gap-[24px]` (inferred from category grid), `px-[80px]`

**Product cards** (see Section 10 for full card anatomy)

**No sidebar/filter panel** is visible in the Figma homepage product grid. Full product listing page filters are not specified.

---

## 15. Product Detail Layout

**Not directly present in provided Figma frames.** Mark as: _Not specified in Figma._

---

## 16. Cart Layout

**Not directly present in provided Figma frames.** Mark as: _Not specified in Figma._

---

## 17. Checkout Layout

**Not directly present in provided Figma frames.** Mark as: _Not specified in Figma._

---

## 18. Login / Register Layout

**Not directly present in provided Figma frames.** Mark as: _Not specified in Figma._

---

## 19. Account and Orders Layout

**Not directly present in provided Figma frames.** Mark as: _Not specified in Figma._

---

## 20. Deals / Promo Banner

**Component:** `DealsBanner`

**Outer container:** full width, `px-[80px]` padding only — no vertical padding on outer shell

**Inner container (`DealsInner`):**
- `bg-[#111]`, `rounded-[24px]`, `overflow-clip`
- Flex row, `flex-[1_0_0]`

**Left text panel:**
- `p-[64px]`, `gap-[32px]`, `flex-[1_0_0]`
- Eyebrow label: Geist Bold 14px `#ff3b00` uppercase — "Limited Time Promo"
- Heading: Outfit ExtraBold 44px, white — "Get 20% off your first modular workspace setup"
- Body copy: Geist Regular 16px `rgba(255,255,255,0.8)`, line-height 1.6. Coupon code "CREATIVE20" in Geist Bold `#ff3b00`
- Button row: Primary button (`bg-[#ff3b00]`) + ghost text link (Outfit SemiBold 15px white)

**Right image panel:**
- `w-[540px] h-[440px]`, `overflow-clip`
- Product photography (workspace/desk setup), no border-radius on image itself (parent clips it)

---

## 21. Testimonials Section

**Component:** `TestimonialsSection`

**Container:** `p-[80px]`, `gap-[40px]`, flex column

**Section header:** centered text alignment
- Title: Outfit Bold 32px `#111`
- Subtitle: Geist Regular 16px `#666662`

**Cards row:** 3 equal `flex-[1_0_66px]` cards, `gap-[24px]`

**Each testimonial card:**
- `bg-white`, `border: 1px solid #ebeae6`, `rounded-[16px]`, `p-[32px]`
- Stars: 5 × 16px, `#FFB000` stroke, `gap-[2px]`
- Quote: Geist Regular 16px `#666662`, line-height 1.6, italic style (but not `font-style: italic` — content uses `" "` punctuation)
- `gap-[16px]` between stars and quote
- Author block: `pt-[24px]` top, flex row `gap-[12px]`
  - Avatar: `40×40px`, `rounded-[20px]`
  - Name: Outfit SemiBold 15px `#111`
  - Title/role: Geist Regular 13px `#666662`

---

## 22. Newsletter Section

**Component:** `NewsletterSection`

**Container:** `bg-white`, `py-[96px]`, 1px border full perimeter `#ebeae6`, centered

**Content block:** `640px` wide, `gap-[32px]`, flex column, items centered

**Heading:** Outfit ExtraBold 36px `#111`, center-aligned — "Join the mykart circular"
**Subtitle:** Geist Regular 16px `#666662`, line-height 1.5, center-aligned

**Input row:** flex, `gap-[12px]`
- Input: `flex-[1_0_42px]`, `h-[52px]`, `bg-[#faf9f6]`, `border: 1px solid #ebeae6`, `rounded-[8px]`, `px-[20px]`
- Button: Primary ("Subscribe")

---

## 23. Footer

**Component:** `Footer`

**Container:** `bg-[#faf9f6]`, `pt-[80px] pb-[48px] px-[80px]`, `gap-[64px]`

**Top row:** flex, `justify-between`, 4 columns
- **Brand column (`280px`):** Logo (28px icon + 20px wordmark) + tagline (Geist Regular 14px `#666662`, line-height 1.6) + social icons
  - Social icons: 4 circles, each `36×36px`, `bg-white`, `border: 1px solid #ebeae6`, `rounded-[18px]`, `gap-[12px]`
  - Icons: Instagram, Twitter, Pinterest (circle-x in design), YouTube — each `16×16px` stroke `#111`
- **Shop, Company, Support columns (`160px` each):**
  - Column heading: Outfit Bold 15px `#111`
  - Links: Geist Regular 14px `#666662`, `gap-[12px]` between links

**Horizontal divider:** 1px line `#EBEAE6`, full width

**Bottom row:** flex, `justify-between`
- Left: copyright + Privacy Policy + Terms of Service, Geist Regular 13px `#666662`, `gap-[24px]`
- Right: payment method badges — VISA, MASTERCARD, APPLE-PAY, PAYPAL
  - Each badge: `bg-white`, `border: 1px solid #ebeae6`, `rounded-[4px]`, `px-[8px] py-[4px]`
  - Text: Geist Bold 10px `#666662` uppercase

---

## 24. Admin Dashboard Visual System

**Not directly present in provided Figma frames.** Mark as: _Not specified in Figma._

---

## 25. Seller Dashboard Visual System

**Not directly present in provided Figma frames.** Mark as: _Not specified in Figma._

---

## 26. Desktop / Tablet / Mobile Behavior

The Figma frames are desktop-only (designed at approximately 1280px wide with 80px horizontal padding).

**Observed desktop layout:**
- Full 1280px width with `px-[80px]` (160px total horizontal padding)
- Multi-column grids: 4-col categories, 4-col products, 3-col testimonials, 2-col hero
- Fixed-width search bar: 440px

**Tablet and mobile:** _Not specified in Figma._ Implement standard responsive breakpoints:
- Tablet (~768px): Reduce to 2-col grids, reduce horizontal padding to 32–40px, compress hero to stacked layout
- Mobile (~375px): Single column, reduce padding to 16–20px, hamburger nav

---

## 27. Hover, Focus, Transition, and Animation Behavior

**Not specified in Figma.** No prototype animations or interaction states are documented in the provided frames. Recommend:

- Primary button: slight `opacity-90` or `brightness-110` on hover
- Secondary button: `bg-[#111]` bg + white text on hover
- Category card: subtle `scale(1.02)` or overlay opacity reduction on hover
- Product card: image scale `1.05` on hover
- All transitions: `duration-200 ease-out`
- Use Framer Motion for page-level transitions (fade/slide in on mount)

---

## 28. Accessibility Requirements

**Observed in Figma code:**
- All decorative overlay divs carry `aria-hidden` attribute — correct pattern
- `pointer-events-none` on decorative borders — correct
- Product images have empty `alt=""` (decorative pattern; real images should have descriptive alt text)
- No focus ring styles specified

**Recommendations:**
- Add `:focus-visible` ring: `2px solid #ff3b00`, 2px offset
- Ensure all interactive elements have accessible labels (Cart badge should have `aria-label="Cart, 3 items"`)
- Color contrast: `#666662` on white is approximately 5.7:1 (passes AA for normal text)
- `#ff3b00` on white is approximately 3.4:1 (passes AA for large text / UI elements; fails for small body text — do not use brand color for body copy)
- Star rating: provide text alternative ("4.5 out of 5 stars")

---

## Component Classification

### A. Existing MyKart Components That Can Be Reused (as-is)

- Any existing Button primitive (will be restyled)
- Any existing Card container
- Any existing Avatar component
- Any existing Input component
- Existing route handlers and page shells (layout.tsx)

### B. Existing Components That Need Modification

| Component | Required Change |
|---|---|
| Button | Apply exact padding (`px-28 py-14`), radius (`rounded-[8px]`), Outfit SemiBold 15px, exact brand color. Remove any existing shadow. |
| Input | Apply `bg-[#faf9f6]`, `border-[#ebeae6]`, `rounded-[8px]`, `h-[52px]`, Geist Regular 14px placeholder |
| Badge | Override to `bg-[#ff3b00]`, `rounded-[8px]`, Geist Bold 9px white for cart count; orange pill variant for product labels |
| Card | Override to `border border-[#ebeae6]`, `rounded-[16px]`, no shadow |
| NavBar / Header | Restructure layout to 3-zone (logo / search / actions), add pill search bar, cart badge |
| Footer | Rebuild to match 4-column layout, social circles, payment badges |

### C. New Components That Need to Be Created

| Component | Description |
|---|---|
| `<Logo>` | Orange icon box + "mykart" wordmark, two size variants (nav: 32px box / 22px text; footer: 28px box / 20px text) |
| `<SearchBar>` | Pill-shaped 440px input, `bg-[#faf9f6]`, search icon, placeholder text |
| `<CartBadgeIcon>` | Shopping bag icon + absolute orange count badge |
| `<PromoPill>` | Orange-tinted pill with Geist SemiBold uppercase text |
| `<HeroBanner>` | Full-width 2-col section with stats row |
| `<StatBlock>` | Number + label vertical pair (used in hero stats row) |
| `<CategoryCard>` | Full-bleed image card with dark overlay and bottom-left text |
| `<FeaturedCategories>` | Section wrapper with header + 4-col grid |
| `<ProductCard>` | Vertical card: image + badge + stars + name + price + add-to-cart button |
| `<ProductGrid>` | 4-col grid wrapper for product cards with section header |
| `<DealsBanner>` | Dark 2-col promo banner with coupon code highlight |
| `<TestimonialCard>` | White bordered card with stars, quote, and author avatar |
| `<TestimonialsSection>` | Section wrapper with centered header + 3-col card row |
| `<NewsletterSection>` | Centered email capture block with input + subscribe button |
| `<StarRating>` | Row of 5 stroke-style stars at 16px with `#FFB000` color |
| `<SocialIconButton>` | Circular white bordered icon button for footer social links |
| `<PaymentBadge>` | Small bordered label for VISA/MC/etc in footer |

---

## Implementation Priority

### Phase 1 — Design Tokens and Global Layout
- Configure Tailwind CSS v4 theme in `src/index.css` (or `globals.css`)
- Add CSS custom properties: all color tokens, font families, border radius values
- Wire Google Fonts: Outfit (wght 600–800) and Geist (wght 400–700) via CSS `@import`
- Set `font-family` defaults: Geist for body, Outfit for headings
- Set `color`, `background-color`, `border-color` base defaults
- Implement page container pattern: `max-w-[1280px] mx-auto px-[80px]`

### Phase 2 — Shared Components
Build and document in order:
1. `<Logo>` (nav + footer variants)
2. `<StarRating>`
3. `<PromoPill>`
4. `<StatBlock>`
5. Primary and Secondary `<Button>`
6. `<Input>` (standard + search pill)
7. `<Badge>` (cart count + product label)
8. `<CartBadgeIcon>`
9. `<SocialIconButton>`
10. `<PaymentBadge>`
11. `<TestimonialCard>`
12. `<ProductCard>`

### Phase 3 — Homepage
Assemble in order from top:
1. `<TopNavBar>` with Logo, SearchBar, Actions
2. `<HeroBanner>` with promo pill, heading, body, buttons, stats, image
3. `<FeaturedCategories>` with section header + 4 `<CategoryCard>`
4. `<ProductGrid>` "Trending Right Now" with 8 `<ProductCard>`
5. `<DealsBanner>` dark promo section
6. `<TestimonialsSection>` with 3 `<TestimonialCard>`
7. `<NewsletterSection>` email capture
8. `<Footer>` 4-column with socials and payment badges

### Phase 4 — Product Pages
- Product listing page (PLP): grid layout, filter sidebar (design not specified — implement functionally consistent with design tokens)
- Product detail page (PDP): image gallery, add to cart, specs (design not specified)

### Phase 5 — Cart and Checkout
- Cart drawer or page (design not specified — use design tokens)
- Checkout flow (design not specified)

### Phase 6 — Authentication / Account / Orders
- Login and register pages (design not specified)
- Account dashboard (design not specified)
- Order history and detail (design not specified)

### Phase 7 — Seller Dashboard
Not specified in Figma — implement using design tokens and shadcn/ui components styled to match the MyKart visual system.

### Phase 8 — Admin Dashboard
Not specified in Figma — implement using design tokens and shadcn/ui components styled to match the MyKart visual system.

### Phase 9 — Responsive Polish
- Implement breakpoints: 1280px (desktop), 1024px (tablet-l), 768px (tablet), 375px (mobile)
- Collapse nav to hamburger on mobile
- Convert all multi-column grids to single column on mobile, 2-col on tablet
- Reduce horizontal padding from 80px → 40px (tablet) → 16px (mobile)
- Hero: stack columns vertically on tablet/mobile

### Phase 10 — Animations and Final Visual QA
- Add Framer Motion page-entry animations (fade + slight upward translate, `duration: 0.3`)
- Add hover states: category card overlay lightening, product card image scale
- Add focus rings: `2px solid #ff3b00`, `outline-offset: 2px`
- Verify color contrast across all text/background combinations
- Verify font rendering at all sizes (especially 9px cart badge — use `text-[9px]` only at that size)
- Audit all `aria-hidden`, `alt`, and label attributes
- QA pixel accuracy against the 8 Figma screenshots

---

## Figma Code Patterns to Preserve in Implementation

1. **Inset border pattern:** decorative borders are rendered as `absolute inset-0 border border-solid pointer-events-none` child divs — do not use `outline` or standard `border` on the container element, as this pattern avoids layout shift.

2. **Image overlay pattern:** category card overlays use `absolute inset-0 bg-[rgba(...)]` layered on top of the background `<img>` — keep this as a two-layer approach.

3. **Icon wrapper pattern:** icons are double-wrapped (outer positioning div + inner overflow-clip div) — in React implementation, simplify to a single wrapper but preserve `size`, `shrink-0`, and `overflow-clip` semantics.

4. **Variable font weights:** Outfit and Geist are variable fonts — use `font-weight` utilities directly rather than loading discrete weight files.
