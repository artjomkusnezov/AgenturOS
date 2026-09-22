STATUS: READY
STARTING_REF: AUTO_LATEST_CURSOR

# AGENTUROS — Kfz hero asset replacement only

Run ONLY after the current Kfz production P0 + final smoke task is FINISHED/validated. Do not interrupt or duplicate the current RUNNING agent.

## Owner request
Replace ONLY:
`public/kfz/lengerich-roemer-hero.webp`

Use the exact owner-provided PNG from the ChatGPT conversation uploaded on 2026-09-22 around 07:58 UTC, named `ChatGPT Image 22. Sept. 2026, 09_57_47.png`. Do NOT generate or substitute another image.

Convert that PNG to an optimized WebP with good hero quality. Preserve the exact target filename/path above.

## Hard constraints
- no other UI/UX changes
- no hero dimensions/layout changes
- no page-code change if the existing path is already used
- no redesign, no copy changes, no funnel/backend changes
- check `/kfz` desktop and ~390px mobile after replacement
- verify the resulting WebP is reasonably optimized/not unnecessarily heavy
- commit the asset change

## Evidence
Report source PNG dimensions/size, resulting WebP dimensions/size, conversion settings/tool, exact changed files, browser proof desktop/mobile, and git commit.

If the Cursor agent cannot access the owner-provided PNG bytes from the ChatGPT attachment, STOP this task as BLOCKED and report that exact blocker. Do not use another image.
