# IMSTEV booking-to-payment validation

## Checkpoint 1 — 2026-08-25

The rebuilt preview backend is running on port 3105 in development mode with database and Quickteller credentials intentionally unset. The health endpoint responds successfully and reports `database: not_configured`, so the preview remains provider-safe and cannot create a real payment intent.

The salon booking route opens at the temporary preview URL, but the browser viewport is currently blank even though the document title is served. This is a runtime-rendering issue to diagnose before completing browser validation; no payment success has been fabricated.

## Checkpoint 2 — Browser render restored

The temporary preview initially rendered blank because exact-origin CORS rejected the preview domain for CSS and JavaScript asset requests. Restarting the server with the temporary public origin in `PUBLIC_APP_URL` and `API_PUBLIC_URL` restored the booking wizard. The page now visibly renders the three-step flow, service catalogue, opening hours, and service selection summary.

## Checkpoint 3 — Service and schedule step

A paid service can be selected and the wizard advances to Date & Time. The preview displays the configured operating hours (Tuesday–Saturday from 8:00 AM, Sunday from 2:00 PM, Monday closed) and the August 2026 calendar. The time panel correctly remains gated until a date is selected.

## Checkpoint 4 — Calendar interaction

The service selection and transition work in the browser. The first attempted calendar click did not change the date selection, so the calendar DOM was inspected rather than assuming the click succeeded. The calendar marks many earlier dates disabled; the current preview date is 25 August 2026, so the next step is to select a genuinely enabled future date and confirm the time list loads.

## Checkpoint 5 — Date and time selection

Selecting 27 August 2026 loads the available slots, and selecting 8:00 AM updates the summary to “Booked for Aug 27 at 8:00 AM.” The time choices are presented in 12-hour format and the Continue control becomes enabled.

## Checkpoint 6 — Booking to payment handoff

With disposable details, the final booking submit navigates to `/payment` and preserves the selected date (2026-08-27), time (8:00 AM), service (Blow Drying), customer contact, and deposit amount (NGN 750). The preview then shows the real provider-safe error that Quickteller merchant credentials are not configured. No booking confirmation or fake payment success is shown.

## Checkpoint 7 — API safety checks

The available-slots endpoint returns the expected 8:00 AM–6:00 PM weekday slot set for 27 August 2026. A direct booking request without a verified transaction reference returns HTTP 400, a made-up reference returns HTTP 400, and payment initialization returns HTTP 500 with the explicit Quickteller merchant-configuration error. These checks confirm the preview does not create an unpaid appointment or fabricate payment success.
