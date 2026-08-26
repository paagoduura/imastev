import { ArrowLeft, ArrowUpRight, FileText, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

const renderInline = (value: string) => value.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : part);

const renderTermsContent = () => termsContent.split(/\n\s*\n/).map((block, index) => {
  const lines = block.split("\n").filter(Boolean);
  const first = lines[0] || "";
  if (first.startsWith("# ")) return <h1 key={index}>{renderInline(first.slice(2))}</h1>;
  if (first.startsWith("## ")) return <h2 key={index}>{renderInline(first.slice(3))}</h2>;
  if (first.startsWith("### ")) return <h3 key={index}>{renderInline(first.slice(4))}</h3>;
  if (lines.every((line) => line.startsWith("- "))) {
    return <ul key={index}>{lines.map((line, itemIndex) => <li key={itemIndex}>{renderInline(line.slice(2))}</li>)}</ul>;
  }
  if (lines.every((line) => line.startsWith("|"))) {
    return <div key={index} className="overflow-x-auto rounded-2xl border border-[#24160d]/10 bg-[#f7f1e8] p-4">{lines.filter((line) => !line.match(/^\|\s*-+/)).map((line, rowIndex) => <p key={rowIndex} className="my-1 text-sm leading-7 text-[#6e5b4c]">{renderInline(line.replace(/^\|\s*|\s*\|$/g, "").replace(/\s*\|\s*/g, " · "))}</p>)}</div>;
  }
  return <p key={index}>{lines.map((line, lineIndex) => <span key={lineIndex}>{lineIndex > 0 && <br />}{renderInline(line)}</span>)}</p>;
});

const termsContent = String.raw`# Terms and Conditions

**Effective date:** 26 August 2026  
**Last updated:** 26 August 2026

These Terms and Conditions govern access to and use of the IMSTEV NATURALS website, applications, digital experiences, community, hair and skin scanning services, consultations, salon bookings, and online shop. By visiting the website, creating an account, placing an order, booking an appointment, purchasing a scan or consultation, submitting content, or otherwise using an IMSTEV NATURALS service, you agree to these Terms and Conditions.

If you do not agree with these Terms, please do not use the Platform or purchase our Products or Services. If you accept these Terms for a company, child, or another person, you confirm that you have authority to do so and that the person or entity will be bound by them.

## 1. About IMSTEV NATURALS

“IMSTEV NATURALS”, “IMSTEV”, “we”, “us”, and “our” refer to the IMSTEV NATURALS business and its authorised service providers operating the Platform and providing the Products and Services. Our studio and customer-support details are:

| Contact | Details |
|---|---|
| Studio | 40 Law School Road, Opp. FirstBank, Bwari, Abuja, Nigeria |
| Phone | +234 903 350 5038 |
| Customer support | contact@imstevnaturals.com |
| Website | https://www.imstevnaturals.com |

The final contracting entity, if different from the IMSTEV NATURALS trading name, will be identified in the applicable order confirmation or other transaction document.

## 2. Definitions

**Platform** means the IMSTEV NATURALS website, applications, pages, forms, account areas, and related digital interfaces. **Products** means organic hair-care, skin-care, and related physical products offered by or through the Platform. **Services** means scans, digital results, consultations, salon appointments, educational materials, community features, and other services made available by IMSTEV NATURALS. **User**, **you**, and **your** mean any person who visits, registers with, or uses the Platform. **Content** means text, photographs, videos, reviews, comments, scan images, product information, designs, software, and other materials made available through or submitted to the Platform.

## 3. Eligibility and responsible use

You must provide accurate information when creating an account, booking an appointment, placing an order, or using a scan. You are responsible for keeping your login details confidential and for all activity carried out through your account. Notify us promptly at contact@imstevnaturals.com if you believe your account has been accessed without permission.

The Platform is intended for adults and for young people using it with the involvement and permission of a parent or legal guardian. A parent or guardian is responsible for a minor’s use of the Platform, purchases, bookings, uploaded images, and community participation. We do not knowingly request unnecessary personal information from children.

You must not misuse the Platform, interfere with its security, attempt unauthorised access, introduce malicious code, scrape or harvest data, impersonate another person, submit unlawful or harmful material, or use the Platform for fraud, harassment, abuse, or unauthorised commercial exploitation.

## 4. Products and Services

IMSTEV NATURALS provides products and wellness-oriented hair and skin experiences designed to help users understand their care needs and make informed choices. The Platform may include the following:

- **Hair and skin scans:** A scan may analyse images and information supplied by you and may produce a preview, observations, suggested care steps, or product recommendations. Access to a limited preview, full result, or recommendation set may depend on the payment or subscription option shown before purchase.
- **Consultations and specialist support:** A consultation is a beauty, hair-care, skin-care, or wellness service unless expressly stated otherwise. It is not a substitute for diagnosis or treatment by a licensed medical professional.
- **Salon appointments:** Booking availability, operating hours, service durations, prices, deposits, cancellation rules, and appointment requirements will be shown at the time of booking or communicated by our team.
- **Products and shop services:** Product descriptions, ingredients, sizes, directions, warnings, prices, stock status, delivery options, and other material information will be shown as accurately as reasonably possible before checkout.

We may update, suspend, withdraw, or replace a Product or Service. If a change materially affects a paid order or confirmed booking, we will provide an appropriate remedy required by applicable law, which may include a replacement, rescheduling, credit, or refund.

## 5. Product information, suitability, and use

We make reasonable efforts to ensure that product names, descriptions, photographs, ingredients, sizes, prices, and availability are accurate. Product colours may appear different across screens and photographs. Minor packaging changes, batch variations, or typographical errors may occur. The label supplied with the Product is the primary reference for ingredients, directions, warnings, and storage instructions.

Before use, read the label and follow the directions. Perform a patch test where appropriate, especially if you have sensitive skin, allergies, a known condition, or a history of reactions. Do not use a Product on broken, infected, or severely irritated skin unless advised by an appropriate healthcare professional. Stop using a Product and seek appropriate professional advice if you experience a serious or persistent reaction.

Descriptions of ingredients, texture, benefits, or expected experience are not guarantees that a Product will produce a particular result for every person. Individual outcomes vary according to hair type, skin type, health, environment, routine, product use, and other factors.

## 6. Accounts, bookings, and orders

An account may be required for scans, full results, community participation, consultations, bookings, order history, or other features. We may verify information, limit accounts, or decline an account where reasonably necessary to protect users, the Platform, or the law.

Submitting an order or booking request does not by itself mean that IMSTEV NATURALS has accepted it. An order or booking is accepted when we issue an acknowledgement or confirmation. We may decline or cancel an order or booking where a Product is unavailable, a price or description contains an obvious error, payment is not authorised, required information is missing, or we reasonably suspect fraud or misuse. If we cancel a paid order or booking, we will refund the amount received for the cancelled item or service, subject to applicable law.

You must provide a correct name, phone number, email address, delivery address, appointment details, and other information reasonably required to fulfil your order or booking. We are not responsible for delays, failed delivery, or missed appointments caused by inaccurate or incomplete information supplied by you.

## 7. Prices, payment, and subscriptions

Prices are displayed in Nigerian Naira unless another currency is expressly stated. Product prices, service prices, delivery charges, taxes, deposits, processing fees, and any recurring charges will be disclosed before you complete payment. A displayed price may be corrected before acceptance where there is an obvious error; if you have already paid, you may cancel the affected order and receive a refund where applicable.

Payments may be processed by third-party payment providers. By submitting payment details, you authorise the applicable payment provider to process the amount shown at checkout or booking. We do not ordinarily store full payment-card details. You must use a payment method that you are authorised to use.

Where a monthly or other recurring subscription is offered, the subscription terms, billing interval, renewal amount, benefits, cancellation method, and promotional conditions will be shown before purchase. A subscription continues until cancelled through the stated method. Cancelling normally prevents future renewal but does not automatically reverse a charge already processed or remove access already delivered, except where a refund is required by law or the relevant offer expressly provides one.

## 8. Delivery and receipt of physical Products

We deliver to the locations and by the methods shown at checkout or separately agreed with you. Estimated delivery dates are estimates and may be affected by stock, courier capacity, public holidays, weather, security conditions, incorrect address details, or events outside our reasonable control.

You should inspect a parcel promptly after delivery. If a Product is missing, damaged, defective, unsafe, materially different from its description, or otherwise not in conformity with the order, contact us at contact@imstevnaturals.com with the order number, a description of the issue, and reasonable supporting photographs or information. We will assess the report and provide a remedy required by applicable law, which may include repair, replacement, price reduction, credit, or refund.

Risk in a Product passes to you when you, or a person nominated by you other than the carrier, takes physical possession of it, except where applicable law provides otherwise. We may use delivery partners, but this does not remove our responsibilities as the seller.

## 9. Returns, refunds, and cancellations

Nothing in these Terms excludes or limits any consumer right, refund right, cancellation right, warranty, or remedy that cannot lawfully be excluded or limited.

### 9.1 Product returns

If a Product is defective, unsafe, damaged before delivery, materially misdescribed, or otherwise fails to comply with applicable consumer law, contact us promptly. We may ask for reasonable information to verify the issue, but we will not use that process to unlawfully delay or defeat a valid consumer remedy.

For health, hygiene, and safety reasons, opened or used Products may not be eligible for a change-of-mind return where applicable law permits that limitation. This does not affect remedies for defective, unsafe, misdescribed, or non-conforming Products. Products accepted for a change-of-mind return must be unused, intact, and in their original packaging unless the law or our written policy states otherwise.

### 9.2 Appointment cancellations and rescheduling

You may request cancellation or rescheduling of an advance booking through the contact method provided in your confirmation. Reasonable cancellation charges or non-refundable deposits, if any, must be disclosed before payment. Where a cancellation right or refund is required by applicable law, it will apply notwithstanding any conflicting wording in these Terms or a promotion.

If IMSTEV NATURALS cancels or cannot provide a confirmed paid appointment, we will offer a reasonable rescheduling option or refund the amount paid for the affected service, subject to applicable law. Repeated late cancellations or no-shows may affect future booking availability, but any charge will be clearly disclosed and applied lawfully.

### 9.3 Digital scans and consultations

Where a digital scan result, consultation, or other digital service has been fully supplied with your prior request or consent for immediate performance, refund rights may be affected to the extent permitted by applicable law. We will not rely on this provision to deny a refund where the service was not supplied, was materially defective, or a refund is otherwise required by law. If a scan or consultation fails because of a technical problem attributable to us, contact support so that we can investigate and, where appropriate, restore access, repeat the service, reschedule, credit, or refund it.

### 9.4 Refund method and timing

Approved refunds will ordinarily be made to the original payment method, unless another method is agreed or required. The time for funds to appear may depend on the payment provider or bank. We will not charge an unlawful fee for exercising a statutory consumer right.

## 10. Hair and skin scan disclaimer

The scan is an informational hair-care and skin-care support tool. It may use automated systems, image analysis, statistical models, and other technology. It is not a medical examination, diagnosis, treatment, prescription, emergency service, or substitute for a consultation with a qualified clinician, dermatologist, trichologist, pharmacist, or other appropriately licensed professional.

Scan outputs may be incomplete, inaccurate, delayed, or unsuitable for a particular person. They depend on image quality, camera angle, lighting, device capability, information supplied, model limitations, and other factors. Do not rely on a scan to make decisions about a serious, worsening, painful, infected, allergic, or otherwise concerning symptom. Seek qualified medical advice for those concerns and emergency assistance for an emergency.

You remain responsible for deciding whether to follow a suggestion and for checking product labels and professional guidance. IMSTEV NATURALS does not guarantee a specific result from a scan, Product, routine, or recommendation.

## 11. Community and user-submitted Content

The community is intended for respectful sharing, encouragement, education, and discussion of hair and skin journeys. You retain ownership of Content you submit, but you grant IMSTEV NATURALS a non-exclusive, worldwide, royalty-free, transferable, and sublicensable licence to host, store, reproduce, format, display, moderate, and distribute that Content through the Platform and related marketing channels for operating and promoting the community and IMSTEV NATURALS. This licence ends for future use when you delete the Content, except where retention is reasonably necessary for legal, security, backup, dispute, or record-keeping purposes.

You confirm that you have the rights and permissions needed to submit Content and grant this licence. Do not upload another person’s image, private information, medical information, or identifying material without their valid permission. Do not upload confidential information, unlawful material, harmful claims presented as fact, hateful or threatening content, sexual content involving minors, harassment, spam, malware, or content that infringes another person’s rights.

We may remove, restrict, or preserve Content and may suspend accounts where reasonably necessary to enforce these Terms, protect users, respond to complaints, comply with law, or maintain the integrity of the community. We do not guarantee that Content will be reviewed, retained, accurate, or available. Community posts are user opinions and are not professional medical advice or an endorsement by IMSTEV NATURALS.

Report suspected abuse, infringement, privacy issues, or unsafe content to contact@imstevnaturals.com with the relevant link or description.

## 12. Intellectual property

The Platform and its Content, excluding Content submitted by users, belong to IMSTEV NATURALS or its licensors and are protected by applicable intellectual-property laws. This includes the IMSTEV NATURALS name, logos, trade dress, photographs, product images, videos, copy, designs, software, scan presentation, and compilation of the Platform.

We grant you a limited, revocable, non-exclusive, non-transferable permission to access and use the Platform for personal, lawful, non-commercial purposes. You must not copy, modify, sell, licence, reverse engineer, frame, reproduce, publish, distribute, or create derivative works from our Content without written permission, except where a mandatory legal right applies.

## 13. Privacy, cookies, and scan images

Our **Privacy Policy** explains what personal information we collect, why we process it, the legal bases we rely on, how long we retain information, the service providers we use, international transfers where relevant, security measures, and how you may exercise applicable data-subject rights. The Privacy Policy should be read alongside these Terms.

Depending on how you use the Platform, information may include account details, contact details, orders, bookings, payment references, community Content, device information, and hair or skin scan images and responses. Please do not upload information that is not needed for the selected service. You are responsible for obtaining permission before submitting another person’s information or image.

We may use cookies and similar technologies for essential operation, security, preferences, analytics, and communications as described in the Privacy Policy and any cookie notice. Where consent is required, we will request it through an appropriate mechanism.

## 14. Third-party services and links

The Platform may use or link to third-party services, including payment processors, hosting providers, delivery partners, communications providers, analytics tools, authentication services, AI or image-analysis providers, and external websites. Those services may have separate terms and privacy policies. We are not responsible for third-party services that we do not control, but we remain responsible for obligations that applicable law places on us as the provider of the relevant Product or Service.

## 15. Availability, security, and changes

We aim to keep the Platform secure and available, but we do not guarantee uninterrupted, error-free, or permanently available access. Maintenance, updates, outages, cyber incidents, provider failures, network conditions, and events outside our reasonable control may affect the Platform.

We may update these Terms to reflect changes to the Platform, Products, Services, law, security, or business operations. The current version will be posted with its effective date. Changes will not retrospectively remove rights that have already accrued or materially change a paid order or booking without an appropriate remedy. Continued use after the effective date means that you accept the updated Terms to the extent permitted by law.

## 16. Disclaimers and limitation of liability

To the fullest extent permitted by law, the Platform and non-essential Content are provided on an “as available” basis. We do not promise that the Platform or any scan, recommendation, Product, or Service will meet every personal expectation or produce a particular outcome.

Nothing in these Terms excludes or limits liability for death or personal injury caused by negligence where such exclusion is unlawful, fraud or fraudulent misrepresentation, deliberate misconduct, breach of non-excludable consumer rights, unsafe or defective Products where liability cannot lawfully be limited, or any other liability that cannot legally be excluded or limited.

Subject to the preceding paragraph and applicable law, IMSTEV NATURALS will not be liable for indirect, incidental, special, punitive, or consequential loss, loss of profits, loss of opportunity, loss of data, or business interruption arising from use of the Platform. Subject to applicable law, our total liability for a claim connected with a paid Product or Service will not exceed the amount you paid to us for the affected Product or Service, or the total amount paid to us by you in the twelve months before the event giving rise to the claim, whichever is more appropriate under applicable law. This limitation does not reduce any remedy that a consumer is legally entitled to receive.

## 17. Indemnity

To the extent permitted by law, you agree to indemnify IMSTEV NATURALS and its officers, employees, contractors, and service providers against reasonable losses, liabilities, costs, and claims arising from your breach of these Terms, misuse of the Platform, unlawful Content, infringement of another person’s rights, fraud, or negligent conduct. This indemnity does not apply to the extent that the claim was caused by our own unlawful conduct or a liability that cannot lawfully be shifted to you.

## 18. Suspension and termination

You may stop using the Platform at any time. We may suspend or terminate access to an account or feature where reasonably necessary because of a serious or repeated breach, fraud, abuse, security risk, non-payment, legal requirement, or operational decision. We will take reasonable steps to avoid disproportionate impact and, where appropriate, explain the reason or available remedy.

Termination does not affect rights or obligations that accrued before termination, including payment obligations, valid refund claims, intellectual-property rights, privacy obligations, dispute provisions, and clauses intended to survive termination.

## 19. Complaints and customer support

We want complaints to be resolved promptly and fairly. Contact contact@imstevnaturals.com with your name, order or booking reference, the relevant Product or Service, the date of the event, and the outcome you are seeking. We aim to acknowledge complaints within three business days and provide a substantive response within ten business days, subject to the complexity of the matter and information required.

If we cannot resolve a complaint, you may use any applicable consumer-protection or regulatory complaint channel available in Nigeria. Nothing in these Terms prevents you from exercising a statutory right or contacting a competent regulator or court.

## 20. Governing law and dispute resolution

These Terms are governed by the laws of the Federal Republic of Nigeria, subject to any mandatory consumer-protection rules that apply to you. The parties will first try in good faith to resolve a dispute through the complaint process in Section 19.

If a dispute is not resolved informally, it may be referred to the courts of competent jurisdiction in Abuja, Federal Capital Territory, Nigeria, unless applicable law gives a consumer the right to bring proceedings elsewhere. The parties may agree in writing to mediation or another lawful alternative-dispute-resolution process.

## 21. General terms

If any part of these Terms is held invalid or unenforceable, it will be modified or severed only to the minimum extent necessary, and the remaining provisions will continue in effect. A failure or delay in enforcing a provision is not a waiver of that provision.

These Terms, together with the Privacy Policy, product-specific terms, booking confirmation, subscription terms, refund or returns policy, delivery information, and any other terms expressly incorporated before purchase, form the agreement between you and IMSTEV NATURALS concerning the relevant use or transaction. If there is a conflict, the more specific transaction term applies to that transaction, subject to applicable law.

You may not transfer your rights or obligations under these Terms without our written consent, except where a mandatory consumer right applies. We may transfer our rights and obligations as part of a lawful business reorganisation, sale, or transfer, provided that your rights are not unlawfully reduced.

## 22. Contact

For questions, support, privacy requests, complaints, product concerns, booking changes, or rights under these Terms, contact:

**IMSTEV NATURALS**  
40 Law School Road, Opp. FirstBank, Bwari, Abuja, Nigeria  
Email: contact@imstevnaturals.com  
Phone: +234 903 350 5038  
Website: https://www.imstevnaturals.com
`;

export default function Terms() {
  return (
    <div className="page-shell min-h-screen bg-[#f7f1e8] text-[#24160d]">
      <Navbar />
      <main>
        <section className="container-wide pt-8 pb-10 sm:pt-14 sm:pb-16">
          <div className="mx-auto max-w-5xl">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#756253] transition hover:text-[#a45a2a]">
              <ArrowLeft size={16} /> Back to IMSTEV NATURALS
            </Link>
            <div className="mt-8 grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#a45a2a]/20 bg-[#fffaf5] px-3 py-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#a45a2a]">
                  <FileText size={14} /> Legal information
                </div>
                <h1 className="mt-5 max-w-xl text-5xl leading-[.96] tracking-[-.06em] sm:text-7xl">Terms for a considered care experience.</h1>
              </div>
              <div className="rounded-[2rem] border border-[#24160d]/10 bg-[#fffaf5]/80 p-6 shadow-[0_18px_60px_rgba(76,48,24,.08)] sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#ead8c2] text-[#8b4e29]"><ShieldCheck size={21} /></div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[.16em] text-[#8b4e29]">Please read before using the Platform</p>
                    <p className="mt-3 text-sm leading-7 text-[#756253]">These Terms explain how our scans, consultations, appointments, shop, subscriptions, and community work. They should be read with our Privacy Policy and any product-specific or booking terms shown before purchase.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="border-y border-[#24160d]/10 bg-[#fffaf5]">
          <div className="container-wide py-10 sm:py-16">
            <article className="prose prose-stone mx-auto max-w-4xl prose-headings:font-display prose-headings:font-normal prose-headings:tracking-[-.04em] prose-h1:hidden prose-h2:mt-12 prose-h2:text-3xl prose-h3:text-xl prose-p:text-[#6e5b4c] prose-p:leading-8 prose-li:text-[#6e5b4c] prose-strong:text-[#24160d] prose-a:text-[#a45a2a] prose-a:no-underline hover:prose-a:underline prose-table:text-sm">
              {renderTermsContent()}
            </article>
          </div>
        </section>
        <section className="container-wide py-12 sm:py-16">
          <div className="mx-auto flex max-w-4xl flex-col gap-5 rounded-[2rem] bg-[#24160d] p-7 text-[#f8f2e8] sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#f2d2a6]">Need help?</p>
              <p className="mt-2 text-2xl tracking-[-.03em]">We are here to help you understand.</p>
              <p className="mt-2 text-sm leading-6 text-[#f8f2e8]/65">Contact us about an order, booking, scan, privacy request, or any part of these Terms.</p>
            </div>
            <a href="mailto:contact@imstevnaturals.com" className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-[#f2d2a6]">Contact support <ArrowUpRight size={16} /></a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
