import { Command } from "cmdk";
import { Drawer } from "vaul";
import { TextMorph } from "torph/react";
import { EXPRESSION_NAMES, eyeGrids, type ExpressionName } from "./expressions.ts";
import {
  BACKGROUND_NAMES,
  backgroundFor,
  bgValue,
  swatchCss,
  type BackgroundName,
  type Theme,
} from "./backgrounds.ts";
import { SHELL_NAMES, SHELLS, shellValue, type ShellName } from "./shells.ts";
import { COSTUME_NAMES, COSTUMES, costumeValue, type CostumeName } from "./costumes.ts";
import {
  FogIcon,
  FollowIcon,
  GithubIcon,
  InfoIcon,
  LedOffIcon,
  LedOnIcon,
  MoonIcon,
  SoundOffIcon,
  SoundOnIcon,
  SunIcon,
  XIcon,
} from "./icons.tsx";

// cmdk item values. Expressions use their bare name; everything else is prefixed.
const THEME_VALUE = "toggle-theme";
const SOUND_VALUE = "toggle-sound";
const LEDS_VALUE = "toggle-leds";
const FOLLOW_VALUE = "toggle-follow";
const FOG_VALUE = "toggle-fog";
const ABOUT_VALUE = "link-about";
const GITHUB_VALUE = "link-github";
const X_VALUE = "link-x";
const REPO = "https://github.com/0xdhrv/lilpix";
const X_PROFILE = "https://x.com/0xdhrv";

function PixelEye({ rows }: { rows: string[] }) {
  return (
    <span className="pixel-eye" style={{ gridTemplateColumns: `repeat(${rows[0].length}, 3px)` }}>
      {rows.flatMap((row, r) =>
        row.split("").map((cell, c) => <i key={`${r}-${c}`} data-on={cell === "#"} />),
      )}
    </span>
  );
}

// A single lit pixel, same unit as the eyes. Text stays for screen readers.
function CurrentMark() {
  return (
    <span className="current">
      <span className="sr-only">Current</span>
    </span>
  );
}

export function Face({ name }: { name: ExpressionName }) {
  const [left, right] = eyeGrids(name);
  return (
    <span className="face" aria-hidden>
      <PixelEye rows={left} />
      <PixelEye rows={right} />
    </span>
  );
}

type CommandMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Touch device: don't auto-focus the search field (it would open the keyboard). */
  touch: boolean;
  /** Highlighted item; controlled so cmdk reports keyboard and pointer moves. */
  highlighted: string;
  onHighlight: (value: string) => void;
  expression: ExpressionName;
  background: BackgroundName;
  shell: ShellName;
  costume: CostumeName | null;
  theme: Theme;
  sound: boolean;
  leds: boolean;
  follow: boolean;
  fog: boolean;
  onExpression: (name: ExpressionName) => void;
  onBackground: (name: BackgroundName) => void;
  onShell: (name: ShellName) => void;
  onCostume: (name: CostumeName | null) => void;
  onToggleTheme: () => void;
  onToggleSound: () => void;
  onToggleLeds: () => void;
  onToggleFollow: () => void;
  onToggleFog: () => void;
};

function MenuBody({
  expression,
  background,
  shell,
  costume,
  theme,
  sound,
  leds,
  follow,
  fog,
  onExpression,
  onBackground,
  onShell,
  onCostume,
  onToggleTheme,
  onToggleSound,
  onToggleLeds,
  onToggleFollow,
  onToggleFog,
}: CommandMenuProps) {
  return (
    <>
      <Command.Input placeholder="Search" />
      <Command.List>
        <Command.Empty>Nothing found.</Command.Empty>

        <Command.Group heading="Expressions">
          {EXPRESSION_NAMES.map((name, i) => (
            <Command.Item key={name} value={name} onSelect={() => onExpression(name)}>
              <Face name={name} />
              <span className="label name">{name}</span>
              {name === expression && <CurrentMark />}
              {i < 9 && <kbd>{i + 1}</kbd>}
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Background">
          {BACKGROUND_NAMES.map((name) => (
            <Command.Item
              key={name}
              value={bgValue(name)}
              keywords={[backgroundFor(name).label, "background"]}
              onSelect={() => onBackground(name)}
            >
              <span className="swatch" style={{ background: swatchCss(name, theme) }} />
              <span className="label">{backgroundFor(name).label}</span>
              {name === background && <CurrentMark />}
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Shell">
          {SHELL_NAMES.map((name) => (
            <Command.Item
              key={name}
              value={shellValue(name)}
              keywords={[SHELLS[name].label, "shell", "color", "body", "appearance"]}
              onSelect={() => onShell(name)}
            >
              <span className="swatch" style={{ background: SHELLS[name].swatch }} />
              <span className="label">{SHELLS[name].label}</span>
              {name === shell && <CurrentMark />}
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Costumes">
          {[null, ...COSTUME_NAMES].map((name) => (
            <Command.Item
              key={name ?? "none"}
              value={costumeValue(name)}
              keywords={[name ? COSTUMES[name].label : "none", "costume", "halloween", "dress up"]}
              onSelect={() => onCostume(name)}
            >
              <span
                className="swatch"
                style={{ background: name ? COSTUMES[name].shell : SHELLS[shell].swatch }}
              />
              <span className="label">{name ? COSTUMES[name].label : "No costume"}</span>
              {name === costume && <CurrentMark />}
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Preferences">
          <Command.Item
            value={THEME_VALUE}
            keywords={["dark", "light", "mode", "theme", "appearance"]}
            onSelect={onToggleTheme}
          >
            <span className="icon">{theme === "dark" ? <SunIcon /> : <MoonIcon />}</span>
            <TextMorph as="span" className="label">
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </TextMorph>
          </Command.Item>
          <Command.Item
            value={SOUND_VALUE}
            keywords={["sound", "audio", "mute", "unmute", "volume"]}
            onSelect={onToggleSound}
          >
            <span className="icon">{sound ? <SoundOffIcon /> : <SoundOnIcon />}</span>
            <TextMorph as="span" className="label">
              {sound ? "Mute sounds" : "Unmute sounds"}
            </TextMorph>
          </Command.Item>
          <Command.Item
            value={LEDS_VALUE}
            keywords={["leds", "lights", "glow", "rgb"]}
            onSelect={onToggleLeds}
          >
            <span className="icon">{leds ? <LedOffIcon /> : <LedOnIcon />}</span>
            <TextMorph as="span" className="label">
              {leds ? "Turn LEDs off" : "Turn LEDs on"}
            </TextMorph>
          </Command.Item>
          <Command.Item
            value={FOLLOW_VALUE}
            keywords={["follow", "cursor", "mouse", "pointer", "look", "track", "tilt", "gyro"]}
            onSelect={onToggleFollow}
          >
            <span className="icon">
              <FollowIcon />
            </span>
            <TextMorph as="span" className="label">
              {follow ? "Stop following cursor" : "Follow cursor"}
            </TextMorph>
          </Command.Item>
          <Command.Item
            value={FOG_VALUE}
            keywords={["fog", "haze", "mist", "atmosphere"]}
            onSelect={onToggleFog}
          >
            <span className="icon">
              <FogIcon />
            </span>
            <TextMorph as="span" className="label">
              {fog ? "Turn fog off" : "Turn fog on"}
            </TextMorph>
          </Command.Item>
        </Command.Group>

        <Command.Group heading="lilpix">
          <Command.Item
            value={ABOUT_VALUE}
            keywords={["about", "help", "info", "credits"]}
            onSelect={() => location.assign("/about/")}
          >
            <span className="icon">
              <InfoIcon />
            </span>
            <span className="label">About lilpix</span>
          </Command.Item>
          <Command.Item
            value={GITHUB_VALUE}
            keywords={["github", "source", "code", "repo", "open source"]}
            onSelect={() => location.assign(REPO)}
          >
            <span className="icon">
              <GithubIcon />
            </span>
            <span className="label">View source on GitHub</span>
          </Command.Item>
          <Command.Item
            value={X_VALUE}
            keywords={["x", "twitter", "social", "follow", "dhruv", "0xdhrv"]}
            onSelect={() => location.assign(X_PROFILE)}
          >
            <span className="icon">
              <XIcon />
            </span>
            <span className="label">Follow on X</span>
          </Command.Item>
        </Command.Group>
      </Command.List>
    </>
  );
}

export function CommandMenu(props: CommandMenuProps) {
  const { open, onOpenChange, touch, highlighted, onHighlight } = props;

  return (
    // cmdk only hears keys from inside the menu, so focus has to land on the search
    // field. On touch, keep the on-screen keyboard closed until the user taps it.
    <Drawer.Root open={open} onOpenChange={onOpenChange} autoFocus={!touch}>
      <Drawer.Portal>
        <Drawer.Overlay className="drawer-overlay" />
        <Drawer.Content className="drawer-content">
          <Drawer.Handle className="drawer-handle" />
          <Drawer.Title className="sr-only">Command menu</Drawer.Title>
          <Command label="Command menu" value={highlighted} onValueChange={onHighlight} loop>
            <MenuBody {...props} />
          </Command>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
