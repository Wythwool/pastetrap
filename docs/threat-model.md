# Threat model

## What this extension is trying to catch

PasteTrap is aimed at pages that push the user into running commands outside the browser.

Typical examples:

- fake CAPTCHA pages that tell the user to press Win+R and paste a PowerShell command
- fake support pages that push CMD or Terminal instructions
- fake browser update pages that hide a downloader in an encoded one-liner
- copy-and-run flows that fetch and execute from a remote URL in one step

## What it actually sees

The extension can inspect page content inside the browser tab where it runs.

That includes:

- visible page text
- buttons and links
- code and pre blocks
- some dialog and modal text
- suspicious container text and selected data attributes
- commands embedded near copy controls

It does not see what happens after the user leaves the browser and runs something in the OS shell.

## What it does not try to do

- It does not hook PowerShell, CMD, bash or Terminal
- It does not scan the filesystem
- It does not inspect processes
- It does not replace endpoint protection
- It does not guarantee that every malicious page will be caught

## Why that boundary exists

Browser extensions do not get to become EDR agents, and they should not pretend to.

The point here is earlier friction. Catch the social engineering page before the user turns it into code execution.

## Likely bypasses

This is a heuristic detector. Bypasses exist.

Examples:

- commands split across several dynamic DOM nodes
- commands hidden behind canvas or images
- wording rewritten to avoid obvious phrases
- a page that relies on audio or video instructions instead of text
- abuse flows that use browser-native prompts or extension install prompts instead of shell commands

## Why local heuristics anyway

Because the target pattern is narrow and common enough that local detection is useful.

You can catch a lot with:

- fake verification wording
- terminal invocation language
- copy and paste bait
- dangerous one-liner structure
- obvious obfuscation and download-execute chains

That gets you a helpful browser-side tripwire without creating a privacy sink.

## Expected pairing

Use this with common sense and normal endpoint protection.

Good stack:

- browser extension warning before execution
- OS-level security controls after execution attempt
- user not blindly pasting garbage from random pages
