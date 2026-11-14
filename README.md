# Gymnazo

Gymnazo is a training app for people who train on their own and for coaches and their clients...

It has two modes on one account. In **Individual mode** you build your own weekly routine, log your workouts and follow your progress. In **Coach mode** you build routines for your clients and follow each client's progress through reports and a training calendar. Gymnazo is about training and performance only.

## To Try it you need to....

Open `index.html` in a browser. The first time, a short welcome asks how you train and lets you pick a theme. The round button at the top lets you switch between Individual and Coach, and between the sample people, so you can see every side.

This is a front-end prototype. It runs on sample data saved in your browser, and there are no accounts or server yet. **Reset sample data** in that same menu starts it fresh.

## What's in it

- **Welcome:** first-time questions (train on my own, train with my coach, or I coach others), your name and your theme
- **Individual:** build and edit your own routine, today's workout, set logging with rest timer, calendar, weekly log of weight, measurements and photos. Join a coach later with their invite code, or leave one, and keep your history
- **Coach:** clients, invites, routines, templates, reports and a calendar of what each client did. A single date can be changed on its own, or the change applied to that weekday from then on. Weekly check-ins and form-check videos to reply to
- **Client:** today's workout, set logging with rest timer, a calendar of their own (done, missed and coming-up days), a weekly check-in, form-check videos, progress photos, body weight and measurements, a profile picture, chat with the coach
- **Daily check:** three quick cards on Today (mood, sleep, body) and a short message back
- **Training rules:** weight goes up when every rep is hit, or every week. Timed exercises count seconds or minutes. A missed workout can be done on another day, and today's finished workout can be edited
- **Search:** one search box for clients, exercises, messages and every setting
- **Settings:** mode, check-in day, reminders, notifications, themes, a data download and log out
- **Install:** can be added to a phone's home screen
- **Themes:** lime (default), pink, lagoon, nebula, sunset, and two light themes, rose and mint(might remove this feature)

## Files

- `index.html`: page and styles
- `data.js`: sample data, exercise library and progress calculations
- `anim.js`: exercise demo animations
- `ui-*.js`: screens
- `app.js`: actions and navigation
- `manifest.webmanifest`, `sw.js`: home screen install and offline support
- `assets/`: logo and app icons
