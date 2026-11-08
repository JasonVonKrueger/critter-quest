# Animated clouds

Generated using the built-in imagegen tool. Original output copied unchanged to `cloud-v1.png`. Rendered as three sprites with different scales and speeds; motion respects prefers-reduced-motion. Geometry masks restrict sprites to the open sky; wrapping uses faded edges. Scene shutdown removes animation listeners and masks.

Cloud prompt: A single isolated fluffy white cumulus cloud for a cheerful children's storybook mobile game, softly painted dimensional highlights, very pale lavender-blue shading underneath, warm sunlit cream-white tops. Wide low horizontal cloud silhouette, rounded puffs, clean soft edges. One cloud only, centered with generous fully transparent padding, no sky, no landscape, no stars, no text, no shadow cast outside cloud. Transparent PNG game sprite. Match bright polished Critter Quest forest and garden illustration.

Meadow edit prompt, using meadow-v1.png as reference: Edit ONLY the sky in this background: remove every white cloud, replacing them with clear blue sky that matches the existing sky gradient and sunlight. Preserve all trees, leaves, mountains, flowers, treehouse, fence, grass, composition, colors and dimensions unchanged. No clouds remaining. Game background will receive moving cloud sprites separately.

Saved as `../backgrounds/meadow-v2.png`.

Garden edit prompt, using garden-v2.png as reference: Edit ONLY the sky: remove all white clouds and reconstruct clear blue sky matching existing gradient. Preserve every other detail of the garden exactly: tree canopy, barrel and tap, forest, fence, sunflowers, soil and flowers, colors, composition and dimensions. Do not add a watering can. No clouds remaining. Moving cloud sprites will be added separately.

Saved as `../backgrounds/garden-v3.png`. Earlier backgrounds remain as source references but are excluded from PWA precaching.
