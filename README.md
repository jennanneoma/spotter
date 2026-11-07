# Spotter

Soooo... Spotter is a coaching app for personal trainers and their clients...

Coaches build weekly workout routines with progressive overload, plan meals for each day of the week, and follow every client's progress through reports and a training calendar. Clients see today's workout with a moving demo of each exercise, log their sets, tick off meals and message their coach.

## To Try it you need to....

Open `index.html` in a browser. The bar at the top switches between the coach view and each client's view, so you can see both sides.

This is a front-end prototype. It runs on sample data saved in your browser, and there are no accounts or server yet. **Reset sample data** in the top bar starts it fresh.

## What's in it

- **Coach:** clients, invites, routines with weekly weight increases, meal plans, templates, reports and a calendar of what each client did. A single date can be changed on its own, or the change applied to that weekday from then on. Weekly check-ins and form-check videos to reply to
- **Client:** today's workout, set logging with rest timer, energy check, meals (including logging something off the plan), a weekly check-in, form-check videos, progress photos, body weight and measurements, chat with the coach
- **Install:** can be added to a phone's home screen
- **Themes:** lime (default), pink, ocean, violet, ember, blush and a light theme(might remove this feature)

## Files

- `index.html`: page and styles
- `data.js`: sample data, exercise library and progress calculations
- `anim.js`: exercise demo animations
- `ui-*.js`: screens
- `app.js`: actions and navigation
- `manifest.webmanifest`, `sw.js`: home screen install and offline support
- `assets/`: logo and app icons
