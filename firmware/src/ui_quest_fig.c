/* SPDX-License-Identifier: GPL-3.0-only
 * FM1 Quest: the heroes as flat coloured figures drawn from rectangles: one colour a class in two tones, the same body for everyone, only the weapon differs
 * (staff, bow, mace, sword, axe, the bard's FM-1). Replaces the baked hero sprites (their pixels are no longer in the flash: tools/gen_quest_sprites.py).
 * q_spr() hands every hero id here; the village recolours the figures as villagers. Coordinates: x from the centre, y up from the feet, in pixels at 1x. */
static const uint16_t QF_LT[6] = {RGB(0xf6, 0xf6, 0xfa), RGB(0x92, 0xc8, 0x68), RGB(0xf0, 0xa0, 0x50), RGB(0x7a, 0xaa, 0xe8), RGB(0xd8, 0xb8, 0xff), RGB(0xe0, 0x60, 0x50)};
static const uint16_t QF_DK[6] = {RGB(0xb4, 0xb8, 0xc8), RGB(0x4a, 0x7a, 0x2e), RGB(0xa8, 0x5a, 0x22), RGB(0x3a, 0x5a, 0x9a), RGB(0x8a, 0x68, 0xc8), RGB(0x8a, 0x2a, 0x22)};
static uint8_t q_var[4];                 /* the alternate of a slot: slot 2 -> the bard (support), slot 3 -> the red warrior (fighter); the Party menu swaps them */
static const char *const Q_ALT_NAME[4] = {"mage", "archer", "bard", "warrior"};
static const char *const Q_ALT_CLASS[4] = {"WIZARD", "ARCHER", "BARD", "WARRIOR"};
static UI_NOINLINE void q_set_var(uint32_t slot, uint32_t v)       /* a slot's class: the support slot gives the cleric or the bard, the fighter slot the knight or the red warrior */
{
    static const uint16_t BASE[4] = {RGB(0xf0, 0xc8, 0x60), RGB(0x7a, 0xb0, 0x4e), RGB(0xe0, 0x8a, 0x3a), RGB(0x5a, 0x8a, 0xd0)};
    static const uint16_t BASED[4] = {RGB(0x7a, 0x64, 0x20), RGB(0x3a, 0x5a, 0x28), RGB(0x7a, 0x4a, 0x20), RGB(0x2a, 0x3a, 0x63)};
    if (slot != 2u && slot != 3u) return;
    q_var[slot] = (uint8_t)(v != 0u);
    Q_TRK[slot] = v ? (slot == 2u ? RGB(0xc8, 0xa8, 0xf0) : RGB(0xd8, 0x4a, 0x3c)) : BASE[slot];
    Q_TRK_DIM[slot] = v ? (slot == 2u ? RGB(0x62, 0x50, 0x82) : RGB(0x6c, 0x26, 0x20)) : BASED[slot];
}

/* ---- the skeleton (the lab's rig, side view: lab-rig.js solve / the "line" look): a pose is a set of joint angles in 1/100 radian, 0 = straight down, + = the way it
 * faces; lengths are fractions of the figure (x1000). Far limbs in the dark tone, near ones in the light, the head a disc, the weapon at the near hand,
 * on the waist, on the back or floating behind it. ---- */
typedef struct { int16_t y, lean, head, aN1, aN2, aF1, aF2, lN1, lN2, lF1, lF2, fN, fF; } qpose_t;
static const qpose_t QP_IDLE = {0, 3, -2, 12, 20, -10, 15, 6, -4, -7, 3, 0, 0};
static const qpose_t QP_SIT = {13, 4, -2, 85, 75, 60, 90, 150, -150, 146, -146, 0, 0};
static const qpose_t QP_ATK0 = {-1, -10, -5, -239, -40, 4, 30, 17, -20, -14, -10, 0, 0};      /* attack: wind-up, hit, follow-through (lab-rig.js attack at u .30, .45, .80) */
static const qpose_t QP_ATK1 = {-1, -2, -5, -149, -15, 1, 30, 50, -30, -40, -10, 0, 0};
static const qpose_t QP_ATK2 = {-1, 5, -5, 20, 20, -2, 30, 12, -19, -10, -10, 0, 0};
static const qpose_t QP_CAST = {-1, -6, -10, 260, 20, 230, 15, 10, -10, -12, 5, 0, 0};         /* cast: both arms up */
static const qpose_t QP_DRAW = {0, 2, -3, 150, 0, 130, 0, 8, -6, -8, 4, 0, 0};                 /* the bow drawn: both arms forward */
static const qpose_t QP_DEAD = {2, -150, -30, 120, 20, 60, 20, -60, -90, -20, -100, 0, 0};
static const uint8_t QF_HAIR[6] = {2, 3, 1, 0, 4, 5};      /* 0 short, 1 long, 2 long in two tails, 3 ponytail, 4 bun, 5 swept up (the villagers: by their colour) */
static const uint8_t QF_MOUNT[6] = {0, 0, 1, 1, 3, 2};       /* where each class keeps its weapon at rest: 0 hand, 1 waist, 2 back, 3 floating behind */
static uint8_t qf_walk;                                       /* a caller sets it while the figures it draws are walking */

static UI_NOINLINE int32_t qf_sin(int32_t cr)                 /* 1/100 rad -> sin x 1016 */
{
    int32_t t = cr * 1024 / 628, i = (t >> 4) & 63, f = t & 15;
    return (Q_SIN[i] * (16 - f) + Q_SIN[(i + 1) & 63] * f) / 2;
}
static UI_NOINLINE int32_t qf_cos(int32_t cr) { return qf_sin(cr + 157); }
static UI_NOINLINE void qf_walkpose(qpose_t *p, uint32_t u)    /* the walk cycle, u 0..255 (lab-rig.js walk) */
{
    int32_t ph = (int32_t)u * 628 / 256, s = qf_sin(ph), c = qf_cos(ph), c1 = c > 0 ? c : 0, c2 = -c > 0 ? -c : 0, sm = s < 0 ? -s : 0, sm2 = s > 0 ? s : 0, ac = c < 0 ? -c : c;
    p->y = (int16_t)(-2 * ac / 1016), p->lean = 6, p->head = -4;
    p->lN1 = (int16_t)(50 * s / 1016), p->lN2 = (int16_t)(-95 * c1 / 1016), p->lF1 = (int16_t)(-50 * s / 1016), p->lF2 = (int16_t)(-95 * c2 / 1016);
    p->fN = (int16_t)(-25 * c1 / 1016), p->fF = (int16_t)(-25 * c2 / 1016);
    p->aN1 = (int16_t)(-55 * s / 1016), p->aN2 = (int16_t)(25 + 25 * sm / 1016), p->aF1 = (int16_t)(55 * s / 1016), p->aF2 = (int16_t)(25 + 25 * sm2 / 1016);
}
static uint16_t qf_speed = 1000;                                /* the pace of the walk cycle, per mille: the four heroes keep 1000, the others differ */
static uint8_t qf_prop;                                         /* 1: an FM-1 on the lap of a seated figure */
static int32_t qf_handx, qf_handy;                              /* where the near hand was drawn (the caller puts smoke there) */
static uint8_t qf_fade;                                         /* 1: every other row cut out (a dithered transparency), 2: a dashed stick, nothing else */
static uint16_t qf_scale = 256;                                 /* a caller's size for the figures it draws, 1/256 of the base 28 px: far ones smaller, and so thinner */
static struct { int32_t cx, oy, k; int flip, solid; } qf;      /* k: the figure's scale, 256 = 28 px tall */
static UI_NOINLINE int32_t qf_x(int32_t j16) { return qf.cx + (qf.flip ? -j16 : j16) / 16; }
static UI_NOINLINE int32_t qf_y(int32_t j16) { return qf.oy + j16 / 16; }
static UI_NOINLINE int32_t qf_rad(int32_t r100) { return r100 * qf.k * 114 / 256000; }     /* a radius of the lab's body model (x100) in 1/16 px */
static UI_NOINLINE void qf_disc(int32_t cx, int32_t cy, int32_t r16, uint16_t c)
{
    int32_t r = (r16 + 8) / 16, dy;
    if (qf.solid >= 0) c = QP((uint32_t)qf.solid);
    if (r <= 0) { if (!qf_fade || !((cx + cy) & 1)) cv_pset(cx, cy, c); return; }
    for (dy = -r; dy <= r; dy++) { int32_t w = q_isqrt(r * r * 4 - dy * dy * 4 + 2) / 2; if (qf_fade && ((cy + dy) & 1)) continue; cv_rect(cx - w, cy + dy, 2 * w + 1, 1, c); }
}
static UI_NOINLINE void qf_cap(int32_t x0, int32_t y0, int32_t x1, int32_t y1, int32_t r0, int32_t r1, uint16_t c)   /* a tapering limb: discs along the bone (lab-rig.js capsule) */
{
    int32_t dx = qf_x(x1) - qf_x(x0), dy = qf_y(y1) - qf_y(y0), len = (dx < 0 ? -dx : dx) > (dy < 0 ? -dy : dy) ? (dx < 0 ? -dx : dx) : (dy < 0 ? -dy : dy), n, i, rm = r0 > r1 ? r0 : r1;
    n = len / (rm / 16 + 1) + 1;
    if (n > 24) n = 24;
    for (i = 0; i <= n; i++)
        qf_disc(qf_x(x0) + dx * i / n, qf_y(y0) + dy * i / n, r0 + (r1 - r0) * i / n, c);
}
static UI_NOINLINE void qf_ell(int32_t cx, int32_t cy, int32_t rx, int32_t ry, uint16_t c)
{
    int32_t dy;
    if (qf.solid >= 0) c = QP((uint32_t)qf.solid);
    if (ry < 1) ry = 1;
    for (dy = -ry; dy <= ry; dy++) { int32_t w = rx * q_isqrt((ry * ry - dy * dy) * 1024) / (32 * ry); if (qf_fade && ((cy + dy) & 1)) continue; cv_rect(cx - w, cy + dy, 2 * w + 1, 1, c); }
}
static UI_NOINLINE void qf_ln(int32_t x0, int32_t y0, int32_t x1, int32_t y1, int32_t w, uint16_t c)     /* a thin straight piece: the weapon, the strap */
{
    int32_t k, n = w * qf.k / 256, steep = (y1 > y0 ? y1 - y0 : y0 - y1) > (x1 > x0 ? x1 - x0 : x0 - x1);
    if (n < 1) n = 1;
    if (qf.solid >= 0) c = QP((uint32_t)qf.solid);
    for (k = 0; k < n; k++) cv_line(x0 + (steep ? k : 0), y0 + (steep ? 0 : k), x1 + (steep ? k : 0), y1 + (steep ? 0 : k), c);
}
/* cls 0 mage, 1 archer, 2 cleric, 3 knight, 4 bard, 5 red warrior, 6 villager. pose 0 idle / walk, 1 wind-up, 2 strike / cast, 3 follow-through, 4 seated, 5 asleep.
 * The body is the lab's "body" look (lab-rig.js renderSide): tapering limbs, a torso, a head with hair; one colour in two tones (the far limbs and the hair darker). */
static UI_NOINLINE void q_fig(uint32_t cls, uint32_t pose, uint32_t fr, int32_t cx, int32_t feet, int32_t s, int flip, int solid, uint16_t lt, uint16_t dk, int kid)
{
    const uint16_t brown = RGB(0x8a, 0x5a, 0x2a), steel = RGB(0xe4, 0xe4, 0xf0), white = RGB(0xff, 0xff, 0xff), gold = RGB(0xe0, 0xb8, 0x4a);
    qpose_t p = QP_IDLE;
    int32_t F16, u = (int32_t)((((fm1_ms * qf_speed / 1000u) + (uint32_t)(cx * 37) * 5u) % 1000u) * 256u / 1000u), j[24][2], hand_w = 0, wl, hx16, hy16;
    enum { PEL, CHE, NEC, HEA, ELN, HAN, ELF, HAF, KNN, ANN, TON, KNF, ANF, TOF, SHF };
    int mount = (int)QF_MOUNT[cls % 6u], flo = cls == 0u && pose == 0u, rid = cls == 0u && (pose == 4u || pose == 6u || pose == 7u);
    qf.cx = cx, qf.k = (int32_t)(s < 1 ? 1 : s) * 256 / (kid ? 2 : 1) * (int32_t)qf_scale / 256, qf.flip = flip, qf.solid = solid;
    if (!lt) lt = QF_LT[cls % 6u];
    if (!dk) dk = QF_DK[cls % 6u];
    F16 = 28 * 16 * qf.k / 256;
    if (flo) {                                                                         /* the mage floats: the staff across the body held in both hands, the legs hanging limp, a slow bob */
        int32_t b = qf_sin((u * 628) / 256);
        p = QP_IDLE;
        p.y = (int16_t)(-3 + 3 * b / 1016), p.lean = 8, p.head = -4;
        p.aN1 = 62, p.aN2 = 58, p.aF1 = 48, p.aF2 = 66;
        p.lN1 = 8, p.lN2 = -30, p.lF1 = -6, p.lF2 = -22;
    } else if (pose == 0 && qf_walk) {
        qf_walkpose(&p, (uint32_t)u + fr * 128u);
        if (qf_walk >= 2u) {                                                           /* running: leaning in, long strides, arms bent and pumping, bouncing */
            p.lean = 16, p.head = -9, p.y = (int16_t)(p.y * 3);
            p.lN1 = (int16_t)(p.lN1 * 17 / 10), p.lN2 = (int16_t)(p.lN2 * 14 / 10), p.lF1 = (int16_t)(p.lF1 * 17 / 10), p.lF2 = (int16_t)(p.lF2 * 14 / 10);
            p.aN1 = (int16_t)(p.aN1 * 14 / 10), p.aF1 = (int16_t)(p.aF1 * 14 / 10), p.aN2 = (int16_t)(p.aN2 + 40), p.aF2 = (int16_t)(p.aF2 + 40);
        }
    }
    else if (pose == 0) { int32_t b = qf_sin((u * 628) / 256); p.y = (int16_t)(-b * 6 / 1016 / 10), p.lean = (int16_t)(3 + b / 1016), p.aN1 = (int16_t)(12 + 5 * b / 1016), p.aF1 = (int16_t)(-10 - 5 * b / 1016); }
    else if (pose == 1) p = cls == 1u ? QP_DRAW : QP_ATK0;
    else if (pose == 2) p = (cls == 0u || cls == 2u || cls == 4u) ? QP_CAST : QP_ATK1;
    else if (pose == 3) p = QP_ATK2;
    else if (pose == 4) p = QP_SIT;
    else if (pose == 6) { int32_t b = qf_sin(u * 628 / 256 * 2); p = QP_IDLE; p.lean = 6, p.aN1 = (int16_t)(75 + 55 * b / 1016), p.aN2 = (int16_t)(40 + 25 * b / 1016), p.aF1 = (int16_t)(30 - 30 * b / 1016); }   /* talking: the hands move */
    else if (pose == 10) {                                                              /* asleep on the ground: on the back, the body flat, the legs along it */
        int32_t b = qf_sin((u * 628) / 256 / 2);
        p = QP_IDLE, p.y = 9, p.lean = -157, p.head = -3 + (int16_t)(b / 600);
        p.aN1 = 120, p.aN2 = 25, p.aF1 = 110, p.aF2 = 30, p.lN1 = 157, p.lN2 = 0, p.lF1 = 150, p.lF2 = 4;
    } else if (pose == 8) {                                                             /* sit-ups: down on the back, up to the knees, hands behind the head */
        int32_t b = qf_sin((u * 628) / 256 * 2), s = (b + 1016) / 2;
        p = QP_SIT, p.y = 8, p.lean = (int16_t)(-156 + 140 * s / 1016), p.head = -4;
        p.aN1 = 200, p.aN2 = 60, p.aF1 = 190, p.aF2 = 70, p.lN1 = 125, p.lN2 = -85, p.lF1 = 118, p.lF2 = -82;     /* knees up, the feet on the ground */
    } else if (pose == 9) {                                                             /* push-ups: face down, the body straight, the arms bending */
        int32_t b = qf_sin((u * 628) / 256 * 2), s = (b + 1016) / 2;
        p = QP_IDLE, p.lean = 150, p.head = -30, p.y = (int16_t)(-4 + 8 * s / 1016);
        p.aN1 = 6, p.aN2 = (int16_t)(10 + 50 * s / 1016), p.aF1 = 4, p.aF2 = (int16_t)(10 + 50 * s / 1016);
        p.lN1 = -150, p.lN2 = 0, p.lF1 = -150, p.lF2 = 0;
    } else if (pose == 7) { int32_t b = qf_sin(u * 628 / 256); p = QP_IDLE; p.aN1 = (int16_t)(250 + 8 * b / 1016), p.aN2 = -115; }     /* smoking: a hand at the mouth */
    else p = QP_DEAD;
    if (rid) p.y = 13, p.lN1 = 12, p.lN2 = -22, p.lF1 = 2, p.lF2 = -26;                 /* relaxed: she sits on her staff, the legs hanging */
    if (pose >= 1 && pose <= 3) mount = 0;
    if (pose == 8 || pose == 9 || pose == 10) mount = 1, hand_w = 1;                        /* lying about: the weapon is put aside (not drawn) */                                             /* the weapon is in the hand to fight */
#define FL(f) ((f) * F16 / 1000)
#define DN(ox, oy, a, l, o) (j[o][0] = (ox) + qf_sin(a) * FL(l) / 1016, j[o][1] = (oy) + qf_cos(a) * FL(l) / 1016)
#define UP(ox, oy, a, l, o) (j[o][0] = (ox) + qf_sin(a) * FL(l) / 1016, j[o][1] = (oy) - qf_cos(a) * FL(l) / 1016)
    j[PEL][0] = 0, j[PEL][1] = p.y * F16 / 100;
    UP(j[PEL][0], j[PEL][1], p.lean, 300, CHE);
    UP(j[CHE][0], j[CHE][1], p.lean + p.head / 2, 50, NEC);
    UP(j[NEC][0], j[NEC][1], p.lean + p.head, 85, HEA);
    DN(j[CHE][0], j[CHE][1], p.aN1, 160, ELN), DN(j[ELN][0], j[ELN][1], p.aN1 + p.aN2, 150, HAN);
    j[SHF][0] = j[CHE][0] - FL(12), j[SHF][1] = j[CHE][1];
    DN(j[SHF][0], j[SHF][1], p.aF1, 160, ELF), DN(j[ELF][0], j[ELF][1], p.aF1 + p.aF2, 150, HAF);
    DN(j[PEL][0], j[PEL][1], p.lN1, 210, KNN), DN(j[KNN][0], j[KNN][1], p.lN1 + p.lN2, 210, ANN);
    j[TON][0] = j[ANN][0] + qf_cos(p.fN) * FL(75) / 1016, j[TON][1] = j[ANN][1] - qf_sin(p.fN) * FL(75) / 1016;
    { int32_t hx = j[PEL][0] - FL(10), hy = j[PEL][1]; DN(hx, hy, p.lF1, 210, KNF); DN(j[KNF][0], j[KNF][1], p.lF1 + p.lF2, 210, ANF); }
    j[TOF][0] = j[ANF][0] + qf_cos(p.fF) * FL(75) / 1016, j[TOF][1] = j[ANF][1] - qf_sin(p.fF) * FL(75) / 1016;
    { int32_t low = j[ANN][1]; if (j[ANF][1] > low) low = j[ANF][1]; if (j[TON][1] > low) low = j[TON][1]; if (j[TOF][1] > low) low = j[TOF][1]; qf.oy = feet - low / 16;
      if (flo || rid) qf.oy -= (F16 * (flo ? 16 : 10) / 100) / 16; }                  /* (she floats above the ground) */
    hx16 = j[PEL][0] - FL(10), hy16 = j[PEL][1];
    if (qf_fade == 2u) {                                                               /* a far figure: a dashed stick (every other pixel of a line), no body */
        static const uint8_t SEG[9][2] = {{PEL, CHE}, {CHE, NEC}, {CHE, ELN}, {ELN, HAN}, {PEL, KNN}, {KNN, ANN}, {PEL, KNF}, {KNF, ANF}, {SHF, ELF}};
        uint32_t q;
        for (q = 0; q < 9u; q++) {
            int32_t ax = qf_x(j[SEG[q][0]][0]), ay = qf_y(j[SEG[q][0]][1]), bx = qf_x(j[SEG[q][1]][0]), by = qf_y(j[SEG[q][1]][1]), dx = bx - ax, dy = by - ay, n = (dx < 0 ? -dx : dx) > (dy < 0 ? -dy : dy) ? (dx < 0 ? -dx : dx) : (dy < 0 ? -dy : dy), i;
            uint16_t col = (q >= 6u) || q == 8u ? dk : lt;
            if (qf.solid >= 0) col = QP((uint32_t)qf.solid);
            for (i = 0; i <= n; i += 2) cv_pset(ax + (n ? dx * i / n : 0), ay + (n ? dy * i / n : 0), col);
        }
        cv_pset(qf_x(j[HEA][0]), qf_y(j[HEA][1]), solid >= 0 ? QP((uint32_t)solid) : lt), cv_pset(qf_x(j[HEA][0]) + 1, qf_y(j[HEA][1]), solid >= 0 ? QP((uint32_t)solid) : lt);
        cv_pset(qf_x(j[HEA][0]), qf_y(j[HEA][1]) - 1, solid >= 0 ? QP((uint32_t)solid) : lt), cv_pset(qf_x(j[HEA][0]) + 1, qf_y(j[HEA][1]) - 1, solid >= 0 ? QP((uint32_t)solid) : lt);
        return;
    }
    /* the far side first: arm, hand, leg, foot */
    qf_cap(j[SHF][0], j[SHF][1], j[ELF][0], j[ELF][1], qf_rad(115), qf_rad(95), dk), qf_cap(j[ELF][0], j[ELF][1], j[HAF][0], j[HAF][1], qf_rad(95), qf_rad(75), dk);
    qf_disc(qf_x(j[HAF][0]), qf_y(j[HAF][1]), qf_rad(100), dk);
    qf_cap(hx16, hy16, j[KNF][0], j[KNF][1], qf_rad(210), qf_rad(150), dk), qf_cap(j[KNF][0], j[KNF][1], j[ANF][0], j[ANF][1], qf_rad(150), qf_rad(105), dk);
    qf_cap(j[ANF][0], j[ANF][1], j[TOF][0], j[TOF][1], qf_rad(100), qf_rad(85), dk);
    /* a weapon kept behind the body: strapped across the back or floating */
    if (mount >= 2) {
        int32_t bx, by, tx, ty;
        if (mount == 2) { bx = j[PEL][0] - FL(30), by = j[PEL][1] - FL(40), tx = j[CHE][0] - FL(120), ty = j[NEC][1] - FL(70); }
        else { bx = j[CHE][0] - FL(230), by = j[CHE][1] + FL(40) + qf_sin(u * 628 / 256) * FL(25) / 1016, tx = bx, ty = by - FL(290); }
        switch (cls) {
        case 0: qf_ln(qf_x(bx), qf_y(by), qf_x(tx), qf_y(ty), 1, brown), qf_disc(qf_x(tx), qf_y(ty), qf_rad(190), lt); break;
        case 1: qf_ln(qf_x(bx), qf_y(by), qf_x(tx), qf_y(ty), 1, brown); break;
        case 4: qf_ln(qf_x(bx - FL(60)), qf_y(by), qf_x(bx + FL(60)), qf_y(by), 3, RGB(0x2a, 0x1e, 0x3a)), qf_ln(qf_x(bx - FL(60)), qf_y(by), qf_x(bx + FL(60)), qf_y(by), 1, lt); break;
        case 5: qf_ln(qf_x(bx), qf_y(by), qf_x(tx), qf_y(ty), 1, brown), qf_ln(qf_x(tx - FL(30)), qf_y(ty), qf_x(tx + FL(40)), qf_y(ty + FL(40)), 3, steel); break;
        default: qf_ln(qf_x(bx), qf_y(by), qf_x(tx), qf_y(ty), 1, steel); break;
        }
    }
    /* the body: the torso in two parts, the neck, the head with its hair */
    {
        int32_t mx = (j[PEL][0] + j[CHE][0]) / 2, my = (j[PEL][1] + j[CHE][1]) / 2 - 8, hxp = qf_x(j[HEA][0]), hyp = qf_y(j[HEA][1]), rx = qf_rad(250) / 16 + 1, ry = rx + (qf.k > 200 ? 1 : 0);
        int32_t back = flip ? 1 : -1;
        qf_cap(j[CHE][0], j[CHE][1], mx, my, qf_rad(340), qf_rad(280), lt), qf_cap(mx, my, j[PEL][0], j[PEL][1], qf_rad(280), qf_rad(300), lt);
        qf_cap(j[CHE][0], j[CHE][1], j[NEC][0], j[NEC][1], qf_rad(115), qf_rad(100), lt);
        uint32_t hs = cls < 6u ? QF_HAIR[cls] : ((uint32_t)lt + (uint32_t)dk) % 5u;
        if (qf_fade != 2u && hs <= 2u && hs >= 1u && ry > 1) {                                           /* long hair: it falls behind the back to the waist */
            int32_t n = 4, q2;
            for (q2 = 0; q2 < n; q2++) qf_ell(hxp + back * (rx * 90 / 100 + q2 * rx / 12), hyp + ry * (6 + q2 * 9) / 10, rx * (60 - q2 * 6) / 100 + 1, ry * 85 / 100 + 1, dk);
        }
        if (hs == 3u) { qf_ell(hxp + back * rx * 11 / 10, hyp - ry / 3, rx * 40 / 100 + 1, ry * 40 / 100 + 1, dk), qf_ell(hxp + back * rx * 17 / 10, hyp + ry / 3, rx * 35 / 100 + 1, ry * 70 / 100 + 1, dk); }   /* a ponytail */
        if (hs == 4u) qf_ell(hxp + back * rx / 5, hyp - ry * 13 / 10, rx * 45 / 100 + 1, ry * 45 / 100 + 1, dk);              /* a bun */
        if (hs == 5u) { qf_ell(hxp + back * rx / 3, hyp - ry * 12 / 10, rx * 60 / 100 + 1, ry * 55 / 100 + 1, dk), qf_ell(hxp + back * rx * 12 / 10, hyp - ry * 7 / 10, rx * 50 / 100 + 1, ry * 40 / 100 + 1, dk); }   /* swept up and back */
        qf_ell(hxp + back * rx * 55 / 100, hyp - ry / 10, rx * 95 / 100, ry * 96 / 100, dk);          /* the hair mass behind */
        qf_ell(hxp - back * rx / 12, hyp + ry / 8, rx * 86 / 100, ry * 88 / 100, lt);                    /* the face */
        qf_ell(hxp + back * rx / 20, hyp - ry * 6 / 10, rx, ry * 45 / 100, dk);                          /* the fringe */
        cv_rect(hxp - back * rx / 2 - (flip ? 1 : 0), hyp - (ry > 5 ? ry / 4 : 0), rx > 5 ? 2 : 1, ry > 5 ? ry / 3 : ry > 2 ? 2 : 1, solid >= 0 ? QP((uint32_t)solid) : dk);   /* an eye */
        if (cls == 0u && qf_fade != 2u) {                                                                          /* the elf: a pointed ear, and a lock of the twin tail over the shoulder */
            cv_rect(hxp + back * (rx + 1), hyp - 1, 2, 1, solid >= 0 ? QP((uint32_t)solid) : lt), cv_rect(hxp + back * (rx + 2), hyp - 2, 1, 1, solid >= 0 ? QP((uint32_t)solid) : lt);
            if (ry > 1) qf_ell(hxp - back * rx * 2 / 10, hyp + ry * 22 / 10, rx * 3 / 10 + 1, ry * 12 / 10 + 1, dk);
        }
    }
    /* the near side: leg, foot, arm, hand */
    qf_cap(j[PEL][0], j[PEL][1], j[KNN][0], j[KNN][1], qf_rad(220), qf_rad(155), lt), qf_cap(j[KNN][0], j[KNN][1], j[ANN][0], j[ANN][1], qf_rad(155), qf_rad(110), lt);
    qf_cap(j[ANN][0], j[ANN][1], j[TON][0], j[TON][1], qf_rad(110), qf_rad(90), lt);
    qf_cap(j[CHE][0], j[CHE][1], j[ELN][0], j[ELN][1], qf_rad(145), qf_rad(110), lt), qf_cap(j[ELN][0], j[ELN][1], j[HAN][0], j[HAN][1], qf_rad(110), qf_rad(90), lt);
    qf_disc(qf_x(j[HAN][0]), qf_y(j[HAN][1]), qf_rad(115), lt);
    qf_handx = qf_x(j[HAN][0]), qf_handy = qf_y(j[HAN][1]);
    if (qf_prop && pose == 4) qf_ln(qf_x(j[PEL][0] + FL(40)), qf_y(j[PEL][1] - FL(20)), qf_x(j[PEL][0] + FL(190)), qf_y(j[PEL][1] - FL(20)), 3, RGB(0x2a, 0x1e, 0x3a)),
        qf_ln(qf_x(j[PEL][0] + FL(40)), qf_y(j[PEL][1] - FL(20)), qf_x(j[PEL][0] + FL(190)), qf_y(j[PEL][1] - FL(20)), 1, lt);
    /* the weapon: its own piece, in its own colour, a little off the line of the forearm so it never reads as a longer arm */
    {
        int32_t hx = j[HAN][0], hy = j[HAN][1], ang = p.aN1 + p.aN2 + (cls == 0u || cls == 1u || cls == 4u ? 0 : 30), tx, ty;
        if (mount == 1) hx = hx16, hy = hy16 + FL(10), ang = -120;                                                              /* sheathed at the hip, hilt back */
        else if (mount >= 2) hand_w = 1;
        wl = cls == 0u ? 420 : cls == 5u ? 330 : cls == 2u ? 220 : 300;
        tx = hx + qf_sin(ang) * FL(wl) / 1016, ty = hy + qf_cos(ang) * FL(wl) / 1016;
        if (flo) tx = hx + FL(300), ty = hy - FL(440);                                                                 /* the staff rises across her, ring up and forward */
        if (rid) hx = j[PEL][0] - FL(120), hy = j[PEL][1] + FL(80), tx = j[PEL][0] + FL(470), ty = hy;               /* the staff under her, flat: she sits on it */
        if (!hand_w) switch (cls) {
        case 0: {                                                                          /* the staff: long, with a ring at the top (an eye in it, white while casting) */
                int32_t sx = qf_x(tx), sy = qf_y(ty), rr = qf_rad(150) / 16 + 2, a;
                const uint16_t tan = RGB(0xd8, 0xc0, 0x90);
                qf_ln(qf_x(hx - (tx - hx) / 3), qf_y(hy - (ty - hy) / 3), sx, sy, 1, brown);
                for (a = 0; a < 16; a++) cv_pset(sx + qcos(a * 4) * rr / 127, sy - rr + qsin(a * 4) * rr / 127 - 1, a & 1 ? tan : lt);
                qf_disc(sx, sy - rr - 1, rr > 3 ? rr / 3 : 1, pose == 2 ? white : RGB(0x2a, 0x1e, 0x3a));
                cv_rect(sx - 1, sy - 1, 3, 1, tan);
            } break;
        case 1: { int32_t px = qf_cos(ang), py = -qf_sin(ang);
                if (pose != 1 && pose != 2) {                                              /* resting in the hand: upright, bulging forward, the string taut */
                    int32_t t1x = qf_x(hx), t1y = qf_y(hy - FL(240)), t2y = qf_y(hy + FL(240)), mx = qf_x(hx + FL(80));
                    qf_ln(t1x, t1y, mx, qf_y(hy), 1, brown), qf_ln(mx, qf_y(hy), t1x, t2y, 1, brown);
                    qf_ln(t1x, t1y, t1x, t2y, 1, white);
                    break;
                }
                qf_ln(qf_x(hx + px * FL(130) / 1016), qf_y(hy + py * FL(130) / 1016), qf_x(hx + qf_sin(ang) * FL(50) / 1016), qf_y(hy + qf_cos(ang) * FL(50) / 1016), 1, brown);
                qf_ln(qf_x(hx + qf_sin(ang) * FL(50) / 1016), qf_y(hy + qf_cos(ang) * FL(50) / 1016), qf_x(hx - px * FL(130) / 1016), qf_y(hy - py * FL(130) / 1016), 1, brown);
                qf_ln(qf_x(hx + px * FL(130) / 1016), qf_y(hy + py * FL(130) / 1016), qf_x(hx - px * FL(130) / 1016), qf_y(hy - py * FL(130) / 1016), 1, white);
                if (pose == 1 || pose == 2) qf_ln(qf_x(hx - qf_sin(ang) * FL(150) / 1016), qf_y(hy - qf_cos(ang) * FL(150) / 1016), qf_x(hx + qf_sin(ang) * FL(150) / 1016), qf_y(hy + qf_cos(ang) * FL(150) / 1016), 1, white); } break;
        case 2: qf_ln(qf_x(hx), qf_y(hy), qf_x(tx), qf_y(ty), 1, brown), qf_disc(qf_x(tx), qf_y(ty), qf_rad(230), steel); break;
        case 4: qf_ln(qf_x(hx - FL(70)), qf_y(hy), qf_x(hx + FL(70)), qf_y(hy), 3, RGB(0x2a, 0x1e, 0x3a)), qf_ln(qf_x(hx - FL(70)), qf_y(hy), qf_x(hx + FL(70)), qf_y(hy), 1, lt),
                qf_ln(qf_x(hx - FL(55)), qf_y(hy + FL(25)), qf_x(hx + FL(55)), qf_y(hy + FL(25)), 1, white); break;
        case 5: qf_ln(qf_x(hx), qf_y(hy), qf_x(tx), qf_y(ty), 1, brown), qf_ln(qf_x(tx - FL(30)), qf_y(ty), qf_x(tx + FL(40)), qf_y(ty + FL(30)), 3, steel); break;
        case 6: break;
        default: qf_ln(qf_x(hx), qf_y(hy), qf_x(tx), qf_y(ty), 2, steel), qf_ln(qf_x(hx - FL(40)), qf_y(hy + FL(25)), qf_x(hx + FL(40)), qf_y(hy - FL(25)), 1, gold); break;
        }
    }
#undef FL
#undef DN
#undef UP
}
/* hero sprite ids (felucca_qsprites.h order) -> class slot, pose, step */
static UI_NOINLINE void qf_ident(uint32_t id, uint32_t *slot, uint32_t *pose, uint32_t *fr)
{
    static const uint8_t POSE[5][4] = {{0, 0, 2, 2}, {0, 0, 1, 1}, {0, 0, 2, 2}, {0, 0, 1, 1}, {0, 0, 0, 0}};   /* idle, idle, cast / draw / ... (per pair) */
    uint32_t base;
    if (id >= QS_MAGE_ROT) { *slot = id - QS_MAGE_ROT, *pose = 5, *fr = 0; return; }
    if (id < QS_WARRIOR_IDLE_0) { *slot = id / 5u, base = id % 5u; *pose = base == 4u ? 4u : POSE[*slot][base]; *fr = base & 1u; return; }
    base = id - QS_WARRIOR_IDLE_0;                                                     /* warrior: idle x2, antic x2, strike x2, follow x2, seat */
    *slot = 3, *fr = base & 1u;
    *pose = base == 8u ? 4u : base < 2u ? 0u : base < 4u ? 1u : base < 6u ? 2u : 3u;
}
static UI_NOINLINE void q_hero_fig(uint32_t id, int32_t x, int32_t y, int32_t s, int flip, int solid)   /* the q_spr() of a hero: same box, a figure inside */
{
    const qspr_t *sp = &QSPR[id];
    uint32_t slot, pose, fr, cls;
    int32_t bx = flip ? 16 - sp->ox - sp->w : sp->ox;
    qf_ident(id, &slot, &pose, &fr);
    cls = slot == 2u && q_var[2] ? 4u : slot == 3u ? (q_var[3] ? 5u : 3u) : slot;
    q_fig(cls, pose, fr, x + s * (bx + sp->w / 2), y + s * (sp->oy + sp->h), s, flip, solid, 0, 0, 0);
}
/* a hero at a slot doing something of its own (the camp: talking, smoking, sitting with the FM-1, training): pose 0..7, the sprite box of the slot's idle frame */
static uint8_t qf_flip;                                                  /* a caller's facing for q_hero_act (1: left) */
static UI_NOINLINE void q_hero_act(uint32_t slot, uint32_t pose, int32_t x, int32_t y, int32_t scale, int prop)
{
    const qspr_t *sp = &QSPR[Q_HERO[slot & 3u]];
    uint32_t cls = slot == 2u && q_var[2] ? 4u : slot == 3u ? (q_var[3] ? 5u : 3u) : slot & 3u;
    qf_prop = (uint8_t)prop, qf_scale = (uint16_t)scale;
    q_fig(cls, pose, 0, x + sp->ox + sp->w / 2, y + sp->oy + sp->h, 1, qf_flip, -1, 0, 0, 0);
    qf_prop = 0, qf_scale = 256, qf_flip = 0;
}
