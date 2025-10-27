## Concept
This is a left to right side scrolling style game that you can play in your web browser where you are a park ranger. You travel to different camp sites and see if there are any illegal fires. If the fire is illegal then the park ranger has to extinguish the fire. The purpose of the game is to teach kids about open fire rules at camp sites.

The game should be written using javascript, html and css. It should have nice, detailed pixel graphics for all game elements.

## Implementation details
* The graphics should be detailed pixel art characters of 32x32 pixels.
* Trees should be at least 64 pixels tall and 48 pixels wide.
* Each camp site is its own screen in the game.
* After one camp site is visited you wander through the forest to another camp site.
* Ratio of legal to illegal campfires is 3 to 5.
* Each camp site should contain a camp fire, trees, a tent and people at each camp site.
* Every camp site should be a different layout but contain all of the same elements.
* If a campsite is legal, it must have the following:
  * A displayed license to have a camp fire
  * The fire must not be too close to the trees
  * The fire cannot be too big.
* To extinguish a fire the player has a water gun that they shoot at the fire by pressing the mouse button
* Shooting the water gun should be animated.
* The player can also cover the fire with a tarp using the X key
* If the camp site has a license then the player must go to the license and click on it for a closer view.
* If the license does not have a camp fire logo on it then it is not a valid license.
* The player must type Y for verify the license or N to mark the license as invalid.
* The player’s water gun starts out having to click many times to put out the fire.
* As the player puts out the fires, the strength of their water gun gets higher. The water gun can level up in strength.
* The more levels the player completes the more illegal fires there are.
* If a player does not call an illegal fire illegal then you lose. If the player calls a legal fire illegal then they lose.
* There is a tutorial where it explains what open burning is and why we need to stop it/ basic mechanics like moving and how to detect if a fire is legal/ how to operate campsite menu
* There can also be things where some rare levels are very dry and in those there is a wildfire where you have to surround the fire to contain it