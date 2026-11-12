# Spotter

Spotter is a coaching app for personal trainers and their clients...

Coaches build weekly workout routines with progressive overload and follow every client's progress through reports and a training calendar. Clients see today's workout with a moving demo of each exercise, log their sets, send weekly check-ins and message their coach.

## To Try it you need to....

Open `index.html` in a browser. The round button next to search lets you switch between the coach and each client, so you can see both sides.

This is a front-end prototype. It runs on sample data saved in your browser, and there are no accounts or server yet. **Reset sample data** in that same menu starts it fresh.

## What's in it

- **Coach:** clients, invites, routines with weekly weight increases, templates, reports and a calendar of what each client did. A single date can be changed on its own, or the change applied to that weekday from then on. Weekly check-ins and form-check videos to reply to
- **Client:** today's workout, set logging with rest timer, energy check, a weekly check-in, form-check videos, progress photos, body weight and measurements, a profile picture, chat with the coach
- **Search:** one search box for clients, exercises, messages and every setting
- **Settings:** check-in day, reminders, notifications, themes and a data download
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
