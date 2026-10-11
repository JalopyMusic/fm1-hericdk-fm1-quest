/* SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 Leo Kuroshita (@kurogedelic), Hügelton Instruments */
/* Physical panel: which matrix button / encoder carries which printed label.
 * The default table can be overridden by HARDWARE CALIBRATION (hold OCT- and
 * OCT+ while powering on), which asks for each label in turn. The learned
 * table lives in .noinit and, with FELUCCA_FLASH, in flash with the settings
 * (project.c). */
enum { B_FX, B_SCL, B_ENV, B_LFO, B_EDIT, B_GLO, B_HOME, B_SAVE, B_ARP, B_SEQ, B_PLAY, B_REC,
       B_OCTDN, B_OCTUP, NB };
enum { EN_SELECT, EN_ALGO, EN_PRESET, EN_K1, EN_K2, EN_K3, EN_K4, NE };
static const char *const B_NAME[NB] = {"FX", "SCL", "ENV", "LFO", "EDIT", "GLO", "HOME", "SAVE",
                                        "ARP", "SEQ", "PLAY", "REC", "OCT-", "OCT+"};
static const char *const E_NAME[NE] = {"SELECT", "ALGORITHM", "PRESETS", "KNOB 1", "KNOB 2",
                                        "KNOB 3", "KNOB 4"};
#define PANEL_MAGIC 0x50414E35u          /* "PAN5": bump when PANEL_DEFAULT changes */

typedef struct {
    uint32_t magic;
    uint8_t btn[NB];             /* matrix button id (0..13) per label */
    uint8_t enc[NE];             /* matrix encoder (0..6) per role */
    int8_t dir[NE];              /* +1 / -1 so that clockwise is + */
} panel_t;
panel_t panel __attribute__((section(".noinit")));

static const panel_t PANEL_DEFAULT = {
    PANEL_MAGIC,
    {2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 0, 1},   /* PLAY = 12, REC = 13 */
    {0, 1, 6, 2, 3, 4, 5},                           /* SELECT = enc 0, ALGORITHM = enc 1, PRESETS = enc 6 */
    {1, 1, 1, 1, 1, 1, 1},
};

static void panel_init(void)                     /* also after a flash load: ids are used as array indexes and shifts */
{
    uint32_t i, ok = panel.magic == PANEL_MAGIC;
    for (i = 0; ok && i < NB; i++)
        ok = panel.btn[i] < 14u;
    for (i = 0; ok && i < NE; i++)
        ok = panel.enc[i] < 7u && (panel.dir[i] == 1 || panel.dir[i] == -1);
    if (!ok)
        panel = PANEL_DEFAULT;
}

static uint32_t panel_btn_of(uint32_t matrix_id)        /* label of a matrix button, NB if none */
{
    uint32_t b;
    for (b = 0; b < NB; b++)
        if (panel.btn[b] == matrix_id)
            return b;
    return NB;
}

static void panel_led(uint32_t label, int on) { fm1_led_key(panel.btn[label], on); }

/* steps of a role, + = clockwise */
static uint32_t ui_input_ms;                    /* the last button, key or knob turn (ui_input.c; autosave) */
static int32_t panel_enc(uint32_t role)
{
    int32_t s = fm1_enc_take(panel.enc[role]) * panel.dir[role];
    if (s)
        ui_input_ms = fm1_ms;                      /* a knob turning is not idle either: autosave waits */
    return s;
}

/* user settings that survive a reset */
#define SETTINGS_MAGIC 0x53455433u              /* "SET3" */
struct { uint32_t magic, palette, lowcut, zoom; } settings __attribute__((section(".noinit")));
/* the Quest options live in settings.zoom (the old large-readout flag is gone), stored as value XOR default so that a zero word is the defaults:
 *   bits 0-1 map enemies (0 few, 1 normal, 2 many), bit 2 damage numbers (1 on), bits 3-4 boss speed (0 slow, 1 normal, 2 fast) */
#define Q_OPT_DENS() ((uint32_t)((settings.zoom & 3u) ^ 1u))
#define Q_OPT_DMG()  ((uint32_t)(((settings.zoom >> 2) & 1u) ^ 1u))
#define Q_OPT_BSPD() ((uint32_t)(((settings.zoom >> 3) & 3u) ^ 1u))
#define Q_OPT_SET(shift, mask, v) (settings.zoom = (settings.zoom & ~((uint32_t)(mask) << (shift))) | ((((uint32_t)(v)) ^ ((mask) == 1u ? 1u : 1u)) & (uint32_t)(mask)) << (shift), settings_later = 1)

/* the lights (menu LIGHTS / KEYS / NOTES), for playing in the dark: kept in flash with the settings
 * (project.c persist_t.lights), read at every boot; not in .noinit, so nothing there moves. The same
 * word keeps SYNC and the REC screen's MODE / START (seq.c rec_tempo, rec_count) */
enum { LIGHTS_OFF, LIGHTS_LOW, LIGHTS_MID, LIGHTS_HIGH, LIGHTS_N };
enum { KEYS_OFF, KEYS_C, KEYS_WHITE, KEYS_N };
/* (the menu's LIGHTS / KEYS / NOTES are gone: the three stay off, so the code that read them folds away) */
static const uint8_t lights_lvl = 0, lights_keys = 0, lights_notes = 0;
static uint8_t lights_sync;                    /* GLO > SYSTEM > SYNC (G_SYNC), kept here: 0 INT, 1 USB, 2 TRS */
static uint8_t q_var[4];                       /* the class variants of the Party slots (ui_quest_fig.c), kept with the settings: bits 14, 15 */
static uint8_t q_warrior_ok;                   /* the red warrior is unlocked (the first boss beaten): bit 29 */
static uint8_t q_ult_seen;                     /* bit per hero: its whole ult animation has been seen once (then a button skips it): mage 6, archer 7, cleric 8; the fighter's bit is RAM only */
static uint8_t q_ult_fullscr;                     /* menu ULT ANIMATION = FULL: the ult plays on the whole screen (bit 28); off: q_ult_simple; otherwise the diagonal band */
static uint8_t q_ult_simple;                   /* menu ULT ANIMATION off: the ult is the simple effect only (bit 5) */
static uint8_t q_boss1_seen;                   /* the first boss has been met: the mage's ult starts at 50 % only that once (bit 4) */
static uint8_t q_filter;                       /* the colour filter of the scenes (menu FILTER): 0 = the default, 1..11 = the user's pick; bits 0-3 */
static void q_filter_set(uint32_t fi);          /* ui_quest.c */
static uint8_t boot_mute;                      /* the power-on sound is off (menu BOOT SOUND): bit 31 */
static uint8_t led_fx = 1, led_sp = 13, led_fd = 3, led_hold;   /* the default: waves, speed 13, fade 3, once per press (hold: it goes on while the key is held) */
static const uint8_t LED_ORDER[6] = {1, 0, 2, 3, 4, 5};   /* the order the menu lists them in: waves, fade, explosion, rain, comet, "fireworks" */  /* KEYBOARD LED: the effect a key press makes, its speed and its fade, 0..15 (bits 16-27) */
static const uint16_t LIGHTS_NS[LIGHTS_N] = {0u, 500u, 1000u, 2000u};   /* the backlight pulse a frame (ns): a lit
                                                * LED ~95 us, the glow (landmarks) 4 us (fm1_input.h) */
static uint32_t lights_word(void)
{
    return (uint32_t)(q_filter & 15u) | (uint32_t)(q_boss1_seen != 0u) << 4 | (uint32_t)(q_ult_simple != 0u) << 5 | (uint32_t)(q_ult_seen & 7u) << 6 |
           (uint32_t)(rec_tempo != 0u) << 9 | (uint32_t)(rec_count != 0u) << 10 | (uint32_t)(usb_full != 0u) << 11 |
           (uint32_t)(lights_sync % 3u) << 12 | (uint32_t)(q_var[2] != 0u) << 14 | (uint32_t)(q_var[3] != 0u) << 15 |
           (uint32_t)(led_fx & 7u) << 16 | (uint32_t)(led_sp & 15u) << 19 | (uint32_t)(led_fd & 15u) << 23 | (uint32_t)(led_hold != 0u) << 27 | (uint32_t)(q_ult_fullscr == 0u) << 28 | 1u << 30 |       /* (bit 28 set = the band, as the older saves always had it) */ (uint32_t)(boot_mute != 0u) << 31 | (uint32_t)(q_warrior_ok != 0u) << 29;
}
static void lights_from_word(uint32_t w)
{
    q_filter = (uint8_t)(w & 15u);
    q_boss1_seen = (uint8_t)((w >> 4) & 1u);
    q_ult_simple = (uint8_t)((w >> 5) & 1u);
    q_ult_seen = (uint8_t)((w >> 6) & 7u);
    q_ult_fullscr = (uint8_t)((((w >> 28) & 1u) == 0u) && ((w >> 30) & 1u));
    if (q_filter > 11u) q_filter = 0;
    rec_tempo = (uint8_t)((w >> 9) & 1u);       /* the REC screen: MODE, START (seq.c) */
    rec_count = (uint8_t)((w >> 10) & 1u);
    usb_full = (uint8_t)((w >> 11) & 1u);       /* menu USB AUDIO (fx.c) */
    lights_sync = (uint8_t)(((w >> 12) & 3u) % 3u);
    q_var[2] = (uint8_t)((w >> 14) & 1u);       /* the bard / the red warrior (the colours follow: main.c felucca_init) */
    q_var[3] = (uint8_t)((w >> 15) & 1u);
    q_warrior_ok = (uint8_t)((w >> 29) & 1u);
    boot_mute = (uint8_t)((w >> 31) & 1u);
    if (!q_warrior_ok) q_var[3] = 0;               /* locked: the knight keeps the slot */
    if ((w >> 30) & 1u) {                       /* older saves (and the first LED defaults): the new defaults stay */
        led_fx = (uint8_t)((w >> 16) & 7u), led_sp = (uint8_t)((w >> 19) & 15u), led_fd = (uint8_t)((w >> 23) & 15u), led_hold = (uint8_t)((w >> 27) & 1u);
        if (led_fx > 5u) led_fx = 0;
    }
}

static void settings_save(void);              /* project.c: flash copy (FELUCCA_FLASH) */
static uint8_t settings_later;                 /* changed while playing: saved once stopped (project.c) */

static void settings_init(void)
{
    if (settings.magic != SETTINGS_MAGIC || settings.palette >= NPALETTES) {
        settings.magic = SETTINGS_MAGIC;
        settings.palette = 4;                  /* MONO (default) */
        settings.lowcut = 0;
        settings.zoom = 0;                     /* large readout of the touched value: off */
    }
    palette_set(settings.palette);
    fx_lowcut = (uint8_t)(settings.lowcut != 0);
}
