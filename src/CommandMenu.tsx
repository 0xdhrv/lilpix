import { Command } from "cmdk";
import { Drawer } from "vaul";
import { EXPRESSION_NAMES, eyeGrids, type ExpressionName } from "./expressions.ts";
import {
  BACKGROUND_NAMES,
  backgroundFor,
  bgValue,
  swatchCss,
  type BackgroundName,
  type Theme,
} from "./backgrounds.ts";
import {
  FogIcon,
  FollowIcon,
  InfoIcon,
  LedOffIcon,
  LedOnIcon,
  MoonIcon,
  SoundOffIcon,
  SoundOnIcon,
  SunIcon,
} from "./icons.tsx";

// cmdk item values. Expressions use their bare name; everything else is prefixed.
const THEME_VALUE = "toggle-theme";
const SOUND_VALUE = "toggle-sound";
const LEDS_VALUE = "toggle-leds";
const FOLLOW_VALUE = "toggle-follow";
const FOG_VALUE = "toggle-fog";
const ABOUT_VALUE = "link-about";

function PixelEye({ rows }: { rows: string[] }) {
  return (
    <span className="pixel-eye" style={{ gridTemplateColumns: `repeat(${rows[0].length}, 3px)` }}>
      {rows.flatMap((row, r) =>
        row.split("").map((cell, c) => <i key={`${r}-${c}`} data-on={cell === "#"} />),
      )}
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
  /** Render as a bottom drawer (mobile) instead of a centered dialog. */
  drawer: boolean;
  /** Highlighted item; controlled so cmdk reports keyboard and pointer moves. */
  highlighted: string;
  onHighlight: (value: string) => void;
  expression: ExpressionName;
  background: BackgroundName;
  theme: Theme;
  sound: boolean;
  leds: boolean;
  follow: boolean;
  fog: boolean;
  onExpression: (name: ExpressionName) => void;
  onBackground: (name: BackgroundName) => void;
  onToggleTheme: () => void;
  onToggleSound: () => void;
  onToggleLeds: () => void;
  onToggleFollow: () => void;
  onToggleFog: () => void;
};

function MenuBody({
  expression,
  background,
  theme,
  sound,
  leds,
  follow,
  fog,
  onExpression,
  onBackground,
  onToggleTheme,
  onToggleSound,
  onToggleLeds,
  onToggleFollow,
  onToggleFog,
}: CommandMenuProps) {
  return (
    <>
      <Command.Input placeholder="Search expressions, backgrounds…" />
      <Command.List>
        <Command.Empty>Nothing found.</Command.Empty>

        <Command.Group heading="Expressions">
          {EXPRESSION_NAMES.map((name, i) => (
            <Command.Item key={name} value={name} onSelect={() => onExpression(name)}>
              <Face name={name} />
              <span className="label">{name}</span>
              {name === expression && <span className="current">Current</span>}
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
              {name === background && <span className="current">Current</span>}
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
            <span className="label">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </Command.Item>
          <Command.Item
            value={SOUND_VALUE}
            keywords={["sound", "audio", "mute", "unmute", "volume"]}
            onSelect={onToggleSound}
          >
            <span className="icon">{sound ? <SoundOffIcon /> : <SoundOnIcon />}</span>
            <span className="label">{sound ? "Mute sounds" : "Unmute sounds"}</span>
          </Command.Item>
          <Command.Item
            value={LEDS_VALUE}
            keywords={["leds", "lights", "glow", "rgb"]}
            onSelect={onToggleLeds}
          >
            <span className="icon">{leds ? <LedOffIcon /> : <LedOnIcon />}</span>
            <span className="label">{leds ? "Turn LEDs off" : "Turn LEDs on"}</span>
          </Command.Item>
          <Command.Item
            value={FOLLOW_VALUE}
            keywords={["follow", "cursor", "mouse", "pointer", "look", "track", "tilt", "gyro"]}
            onSelect={onToggleFollow}
          >
            <span className="icon">
              <FollowIcon />
            </span>
            <span className="label">{follow ? "Stop following cursor" : "Follow cursor"}</span>
          </Command.Item>
          <Command.Item
            value={FOG_VALUE}
            keywords={["fog", "haze", "mist", "atmosphere"]}
            onSelect={onToggleFog}
          >
            <span className="icon">
              <FogIcon />
            </span>
            <span className="label">{fog ? "Turn fog off" : "Turn fog on"}</span>
          </Command.Item>
        </Command.Group>

        <Command.Group heading="lilpix">
          <Command.Item
            value={ABOUT_VALUE}
            keywords={["about", "help", "info", "credits", "github", "source"]}
            onSelect={() => location.assign("/about/")}
          >
            <span className="icon">
              <InfoIcon />
            </span>
            <span className="label">About lilpix</span>
          </Command.Item>
        </Command.Group>
      </Command.List>
    </>
  );
}

export function CommandMenu(props: CommandMenuProps) {
  const { open, onOpenChange, drawer, highlighted, onHighlight } = props;

  if (drawer) {
    return (
      <Drawer.Root open={open} onOpenChange={onOpenChange}>
        <Drawer.Portal>
          <Drawer.Overlay className="drawer-overlay" />
          <Drawer.Content
            className="drawer-content"
            // Keep the on-screen keyboard closed until the user taps the search field.
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
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

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command menu"
      value={highlighted}
      onValueChange={onHighlight}
      loop
      overlayClassName="cmdk-overlay"
      contentClassName="cmdk-content"
    >
      <MenuBody {...props} />
    </Command.Dialog>
  );
}
