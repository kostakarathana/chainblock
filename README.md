# Sketch
Note: the original name was chainblock, but it has been changed to Sketch. 

## how does it work? 
This project aims to put algorithmic trading in the hands of the layman rather than big institutions. Through scratch-inspired draggable blocks, the user can "set and forget" logic about how to trade:

![alt text](<Screenshot 2025-09-07 at 10.22.23.png>)

Under the hood, we use blockly.js as well as a compiler/translator that turns the block commands into custom smart contracts with pyteal and a basic local backend for now. Since the contracts are immutable, we plan to impliment an admin key that can disable the contract too. Users can keep track of the contracts that they have submitted.

DEMO VIDEO:
<video controls src="Screen Recording 2025-09-07 at 10.38.06.mp4" title="Title"></video>

LOOM VIDEO:
<video controls src="Introducing Sketch_ A User-Friendly Tool for Custom Algorithmic Trading-1.mp4" title="Title"></video>

