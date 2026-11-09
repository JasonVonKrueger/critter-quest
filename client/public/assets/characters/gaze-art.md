# Food-following gaze assets

Generated with the built-in imagegen tool using the existing character sheets as references. PNGs are preserved unchanged; atlas metadata aligns the characters’ scale and baseline. Each 2×2 sheet contains `left`, `down`, `right`, and `forward` frames. Runtime idle poses use the three food directions; the original sheets still provide blinking, eating, happy reactions, and forward gaze. No mesh deformation is used.

Files:
- `snake/snake-gaze-v1.png` and `.json`
- `bunny/bunny-gaze-v1.png` and `.json`
- `bunny/bunny-sad-gaze-v1.png` and `.json`

## Snake prompt

Create an exact identity-preserving game sprite sheet using ONLY the top-left green snake in reference. 2x2 equal square cells, identical full-body pose/position/scale/baseline and lighting across all four cells. CHANGE ONLY EYE GAZE: top-left BOTH pupils clearly looking DOWN-LEFT toward an item on ground to viewer's left; top-right BOTH pupils looking straight DOWN toward ground below mouth; bottom-left BOTH pupils looking DOWN-RIGHT toward viewer's right; bottom-right original forward gaze. Head must NOT turn or tilt. Move dark pupils and amber irises within eyeballs, exposing appropriate white sclera, distinct natural directional gaze. Same coiled green snake, friendly smile, no tongue, no food, no text, no borders. Transparent background and generous padding around full animal. Exact same body design as reference top-left pose.

## Bunny prompt

Create an exact identity-preserving game sprite sheet using ONLY the top-left seated bunny in reference. 2x2 equal square cells, identical full-body pose/position/scale/baseline and lighting across all four cells. CHANGE ONLY EYE GAZE: top-left BOTH pupils clearly looking DOWN-LEFT toward an item on ground to viewer's left; top-right BOTH pupils looking straight DOWN toward ground below nose; bottom-left BOTH pupils looking DOWN-RIGHT toward viewer's right; bottom-right original forward gaze. Head must NOT turn or tilt. Shift dark pupils and warm brown irises inside eyeballs with appropriate white sclera, unmistakable natural directional gaze. Same fluffy cream-white bunny, pink ears/paws, blue neck tuft, little friendly smile. No food, no text, no borders. Transparent background and generous padding around full animal. Exact same body and face design as reference top-left pose.

## Hungry bunny prompt

Create an exact identity-preserving game sprite sheet using ONLY the LEFT sad seated bunny in reference. 2x2 equal square cells, identical full-body pose/position/scale/baseline and lighting across all four cells. CHANGE ONLY EYE GAZE: top-left BOTH pupils clearly looking DOWN-LEFT toward an item on ground to viewer's left; top-right BOTH pupils looking straight DOWN toward ground below nose; bottom-left BOTH pupils looking DOWN-RIGHT toward viewer's right; bottom-right original forward gaze. Head must NOT turn or tilt. Shift dark pupils and brown irises within eyeballs, exposing appropriate white sclera, unmistakable natural gaze. Keep gentle sad eyebrows and small downturned mouth. Same cream-white bunny with blue neck tuft, no food, no tears, no distress, no text or borders. Transparent background with generous padding. All four animals exact same seated body shape and proportions.
