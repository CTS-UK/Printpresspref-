# Press bench

A small workshop app for a flat heat press and a cup press. Pick a shirt, coaster, mouse mat, or mug, then the material, and it shows the heat in **Celsius**, the time, the pressure, and the peel. There is a timer for each step.

It also keeps a shelf count and a log of stock changes and presses.

## Run it

```bash
npm install
npm test
npm run dev
```

Open http://localhost:3000. The app listens on all interfaces, so a tablet on the same network can use it too.

Stock and the press card are open. Editing blanks and settings asks for a PIN. The starter PIN is `2468`. Set `PRESS_PIN` in a `.env` file before anyone else can reach the computer. See `.env.example`.

Your shelf, tested settings, and logs live in `data/press.db`. That file is not in git. Copy it if you want a backup. The starter charts load the first time the database is created.

## How it is organised

- **Materials** are the fabric or coating: cotton, polyester, blends, coated ceramic, MDF, neoprene.
- **Blanks** are the physical items, with UK sizes (letter sizes, centimetres, millilitres).
- **Settings** are the heat, time, pressure, and steps for one blank, material, and print method.
- **End products** are the things you sell, pointed at a blank and a setting.
- **Stock** is how many of a blank, size, and material are on the shelf.
- **Presses** can be added later. A temperature offset lets a controller that reads high still land on the right platen temperature.

Sublimation on cotton is blocked. Cotton uses vinyl or DTF. Mugs and tumblers ask for the cup press.

## Settings are starting points

Every seeded setting is marked **starter**. Charts from suppliers do not match each other, and your blank brand, film, and press will move the numbers. Press a scrap, then save a tested copy. The tested one is what the card shows next time.

Heat is stored in Celsius. If a chart also prints a Fahrenheit figure that does not round to the same whole number (Siser EasyWeed is 150°C and 305°F), both are shown.

Sources used for the starters:

- Joto Imaging Supplies, sublimation time, temperature, and pressure chart
- The Stainless Depot, sublimation settings for shirts, mugs, tumblers, and coasters
- HTVRONT, sublimation parameter chart
- Siser EasyWeed heat press instructions, for ordinary polyurethane vinyl
- DTF Database and On Target Print Solutions, for cotton and polyester DTF windows

Glitter, flock, and nylon films are not given a vinyl recipe. Add one from the pack when you use them.
