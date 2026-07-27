"""
Convert a filled-outline signature SVG into open CENTERLINE stroke paths,
so stroke-dashoffset can trace it like handwriting.

  raster -> binary mask -> skeletonize -> graph -> polylines
         -> RDP simplify -> Catmull-Rom smoothing -> SVG paths

The filled artwork has 17 closed subpaths (outlines of the pen strokes).
A skeleton collapses each stroke to its 1px medial axis, which IS the pen
path — that is what we can then dash-animate.
"""
import sys, json
import numpy as np
from PIL import Image
from skimage.morphology import skeletonize
from scipy import ndimage

RASTER = sys.argv[1]
OUT_SVG = sys.argv[2]
SCALE = float(sys.argv[3])        # raster px per viewBox unit
VB_W, VB_H = 175.0, 75.0

# ── 1. binary mask ────────────────────────────────────────────────
img = np.array(Image.open(RASTER).convert("L"))
mask = img > 100

# ── 2. stroke width from the distance transform ───────────────────
dist = ndimage.distance_transform_edt(mask)
skel = skeletonize(mask)
widths = dist[skel] * 2.0
stroke_w = float(np.median(widths)) / SCALE

# ── 3. skeleton -> graph ──────────────────────────────────────────
ys, xs = np.nonzero(skel)
pts = set(zip(ys.tolist(), xs.tolist()))
N8 = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]

def nbrs(p):
    y, x = p
    return [(y+dy, x+dx) for dy, dx in N8 if (y+dy, x+dx) in pts]

deg = {p: len(nbrs(p)) for p in pts}
nodes = {p for p in pts if deg[p] != 2}

visited_edges = set()

def walk(start, first):
    """Follow a degree-2 chain from `start` through `first` to the next node."""
    path = [start, first]
    visited_edges.add(frozenset((start, first)))
    prev, cur = start, first
    while deg.get(cur, 0) == 2:
        nxt = [q for q in nbrs(cur) if q != prev]
        if not nxt:
            break
        prev, cur = cur, nxt[0]
        if frozenset((prev, cur)) in visited_edges:
            break
        visited_edges.add(frozenset((prev, cur)))
        path.append(cur)
    return path

polylines = []
for n in sorted(nodes):
    for m in nbrs(n):
        if frozenset((n, m)) not in visited_edges:
            polylines.append(walk(n, m))

# closed loops with no node at all (e.g. an 'o')
for p in sorted(pts):
    if deg[p] == 2 and not any(frozenset((p, q)) in visited_edges for q in nbrs(p)):
        polylines.append(walk(p, nbrs(p)[0]))

# ── 4. RDP simplify ───────────────────────────────────────────────
def rdp(points, eps):
    if len(points) < 3:
        return points
    a, b = np.array(points[0], float), np.array(points[-1], float)
    ab = b - a
    L = np.hypot(*ab)
    if L == 0:
        d = [np.hypot(*(np.array(p, float) - a)) for p in points]
    else:
        d = [abs(np.cross(ab, np.array(p, float) - a)) / L for p in points]
    i = int(np.argmax(d))
    if d[i] <= eps:
        return [points[0], points[-1]]
    return rdp(points[:i+1], eps)[:-1] + rdp(points[i:], eps)

def polylen(pl):
    """Length in viewBox units."""
    return sum(
        np.hypot(pl[i+1][0]-pl[i][0], pl[i+1][1]-pl[i][1])
        for i in range(len(pl) - 1)
    ) / SCALE

# Skeletonizing leaves short spurs at every self-intersection. They are
# invisible but would each become a path and an animation segment, so
# anything under a stroke-width's worth of travel is dropped.
MIN_LEN = 1.2
EPS = SCALE * 0.10
simplified = []
for pl in polylines:
    if len(pl) < 4 or polylen(pl) < MIN_LEN:
        continue
    s = rdp(pl, EPS)
    if len(s) >= 2:
        simplified.append(s)

# ── 5. writing order: left to right by leftmost point ─────────────
def leftmost(pl):
    return min(x for _, x in pl)

simplified.sort(key=leftmost)

# ── 6. Catmull-Rom -> cubic Bezier for smooth curves ──────────────
def to_path(pl):
    # (y, x) -> viewBox (x, y)
    P = [(x / SCALE, y / SCALE) for y, x in pl]
    if len(P) == 2:
        return f"M{P[0][0]:.2f} {P[0][1]:.2f}L{P[1][0]:.2f} {P[1][1]:.2f}"
    d = [f"M{P[0][0]:.2f} {P[0][1]:.2f}"]
    ext = [P[0]] + P + [P[-1]]
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i-1], ext[i], ext[i+1], ext[i+2]
        c1 = (p1[0] + (p2[0]-p0[0]) / 6.0, p1[1] + (p2[1]-p0[1]) / 6.0)
        c2 = (p2[0] - (p3[0]-p1[0]) / 6.0, p2[1] - (p3[1]-p1[1]) / 6.0)
        d.append(f"C{c1[0]:.2f} {c1[1]:.2f} {c2[0]:.2f} {c2[1]:.2f} {p2[0]:.2f} {p2[1]:.2f}")
    return "".join(d)

paths = [to_path(pl) for pl in simplified]

svg = [
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VB_W:g} {VB_H:g}" fill="none">',
    f'  <g stroke="white" stroke-width="{stroke_w:.2f}" stroke-linecap="round" stroke-linejoin="round">',
]
for d in paths:
    svg.append(f'    <path d="{d}"/>')
svg += ["  </g>", "</svg>", ""]
open(OUT_SVG, "w").write("\n".join(svg))

print(json.dumps({
    "strokes": len(paths),
    "stroke_width_viewbox": round(stroke_w, 3),
    "raw_polylines": len(polylines),
    "dropped_nubs": len(polylines) - len(simplified),
    "bytes": len("\n".join(svg)),
}, indent=1))
