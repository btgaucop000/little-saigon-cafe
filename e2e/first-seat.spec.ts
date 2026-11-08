import { expect, test, type Page } from '@playwright/test';

type SeatId = 'seat-left' | 'seat-right';

const app = (page: Page) => page.locator('main.app');

async function gotoCafe(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__cafe));
}

function seatPoint(page: Page, id: SeatId) {
  return page.evaluate((seatId) => window.__cafe!.seatScreenPoint(seatId), id);
}

function avatarPose(page: Page) {
  return page.evaluate(() => window.__cafe!.avatarPose());
}

async function drag(page: Page, from: { x: number; y: number }, dx: number) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + dx / 2, from.y, { steps: 5 });
  await page.mouse.move(from.x + dx, from.y, { steps: 5 });
  await page.mouse.up();
}

function avatarSeat(page: Page) {
  return page.evaluate(() => window.__cafe!.avatarSeat());
}

/** Pans until the seat is comfortably on screen (the right chair starts off-screen on phones). */
async function seatInView(page: Page, id: SeatId) {
  const width = page.viewportSize()!.width;
  let p = await seatPoint(page, id);
  if (p.x < 60 || p.x > width - 60) {
    await drag(page, { x: width / 2, y: 300 }, width / 2 - p.x);
    p = await seatPoint(page, id);
  }
  return p;
}

async function chooseSeat(page: Page, id: SeatId) {
  const p = await seatInView(page, id);
  // With the sheet open the cushion is covered on phones; tap the visible backrest instead.
  const sheetOpen = (await page.getByRole('button', { name: 'Ngồi đây' }).count()) > 0;
  await page.mouse.click(p.x - (sheetOpen ? 20 : 0), p.y - (sheetOpen ? 60 : 0));
  await expect(app(page)).toHaveAttribute('data-selected-seat', id);
  await expect(page.getByText('Ngồi chỗ này nhé?')).toBeVisible();
}

async function sitAt(page: Page, id: SeatId) {
  await chooseSeat(page, id);
  await page.getByRole('button', { name: 'Ngồi đây' }).click();
  await expect(app(page)).toHaveAttribute('data-avatar-seat', id);
  await expect.poll(() => avatarSeat(page)).toBe(id);
}

test.describe('mobile portrait', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('tap a free seat, confirm, and the avatar walks then sits', async ({ page }) => {
    await gotoCafe(page);
    const seat = await seatPoint(page, 'seat-left');
    expect(seat.x).toBeGreaterThan(0);
    expect(seat.x).toBeLessThan(390);

    await page.mouse.click(seat.x, seat.y);
    await expect(app(page)).toHaveAttribute('data-selected-seat', 'seat-left');
    // Record the pose on every frame: the walk is short (280ms), so a single read after the
    // click can already miss the standing phase on a slow CI machine.
    await page.evaluate(() => {
      const w = window as unknown as { __poses: string[] };
      w.__poses = [];
      const tick = () => {
        const pose = window.__cafe!.avatarPose();
        w.__poses.push(pose);
        if (pose !== 'sit' || w.__poses.length < 2) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.getByRole('button', { name: 'Ngồi đây' }).click();

    await expect(app(page)).toHaveAttribute('data-avatar-seat', 'seat-left');
    await expect.poll(() => avatarPose(page)).toBe('sit');
    // The avatar kept standing after the click and switched to sitting only on arrival.
    const poses = await page.evaluate(() => (window as unknown as { __poses: string[] }).__poses);
    expect(poses[0]).toBe('stand');
    expect(poses.at(-1)).toBe('sit');
    expect(poses.indexOf('sit')).toBeGreaterThan(0);
    await expect(page.getByRole('status')).toContainText('Ngồi xuống rồi');
  });

  test('sits on the left or the right chair (mobile)', async ({ page }) => {
    await gotoCafe(page);
    await sitAt(page, 'seat-left');
    await expect(page.getByRole('status')).toContainText('Ngồi xuống rồi');
    await page.reload();
    await page.waitForFunction(() => Boolean(window.__cafe));
    await sitAt(page, 'seat-right');
  });

  test('changes the selection before confirming (mobile)', async ({ page }) => {
    await gotoCafe(page);
    await chooseSeat(page, 'seat-left');
    await chooseSeat(page, 'seat-right');
    await page.getByRole('button', { name: 'Ngồi đây' }).click();
    await expect.poll(() => avatarSeat(page)).toBe('seat-right');
  });

  test('switches seats while seated, both ways (mobile)', async ({ page }) => {
    await gotoCafe(page);
    await sitAt(page, 'seat-left');
    await sitAt(page, 'seat-right');
    await sitAt(page, 'seat-left');
  });

  test('first-visit hint shows once and not again after interacting', async ({ page }) => {
    await gotoCafe(page);
    const hint = page.getByText('Chạm vào ghế để chọn chỗ ngồi');
    await expect(hint).toBeVisible();
    await chooseSeat(page, 'seat-left');
    await expect(hint).toHaveCount(0);
    await page.getByRole('button', { name: 'Đóng' }).click();
    await expect(hint).toHaveCount(0);
    await page.reload();
    await page.waitForFunction(() => Boolean(window.__cafe));
    await expect(hint).toHaveCount(0);
  });

  test('hint sits above the left backrest, on screen and clear of the avatar', async ({ page }) => {
    await gotoCafe(page);
    const box = (await page.getByText('Chạm vào ghế để chọn chỗ ngồi').boundingBox())!;
    const chair = await seatPoint(page, 'seat-left'); // chair cushion centre
    const feet = await page.evaluate(() => window.__cafe!.avatarScreenPoint());
    const scale = 844 / 1000;
    expect(box.x).toBeGreaterThanOrEqual(8);
    expect(box.x + box.width).toBeLessThanOrEqual(390 - 8);
    expect(box.y + box.height).toBeLessThan(chair.y); // above the chair...
    expect(box.y + box.height).toBeGreaterThan(chair.y - 160); // ...but close to it
    expect(box.x).toBeGreaterThanOrEqual(feet.x + 64 * scale); // right of the standing avatar
  });

  test('switch action changes the selection, keeps the avatar standing, then sits', async ({ page }) => {
    await gotoCafe(page);
    await chooseSeat(page, 'seat-left');
    const sw = page.getByRole('button', { name: 'Đổi ghế' });
    await sw.click();
    await expect(app(page)).toHaveAttribute('data-selected-seat', 'seat-right');
    await expect(app(page)).toHaveAttribute('data-avatar-seat', 'none');
    expect(await avatarPose(page)).toBe('stand');
    // The right chair was off-screen: the existing reveal brings it into view.
    await expect.poll(() => page.evaluate(() => window.__cafe!.cameraMoving())).toBe(false);
    const right = await seatPoint(page, 'seat-right');
    expect(right.x).toBeGreaterThan(0);
    expect(right.x).toBeLessThan(390);

    await sw.click();
    await expect(app(page)).toHaveAttribute('data-selected-seat', 'seat-left');
    await page.getByRole('button', { name: 'Ngồi đây' }).click();
    await expect.poll(() => avatarSeat(page)).toBe('seat-left');
  });

  test('tap outside or × closes the bar without selecting anything', async ({ page }) => {
    await gotoCafe(page);
    await chooseSeat(page, 'seat-left');
    await page.mouse.click(200, 300); // wall/window: empty scene
    await expect(app(page)).toHaveAttribute('data-selected-seat', 'none');
    await expect(page.getByRole('button', { name: 'Ngồi đây' })).toHaveCount(0);

    await chooseSeat(page, 'seat-left');
    await page.getByRole('button', { name: 'Đóng' }).click();
    await expect(app(page)).toHaveAttribute('data-selected-seat', 'none');
    await expect(app(page)).toHaveAttribute('data-avatar-seat', 'none');
  });

  test('while seated, the bar for the other chair only offers to sit there', async ({ page }) => {
    await gotoCafe(page);
    await sitAt(page, 'seat-left');
    await chooseSeat(page, 'seat-right');
    await expect(page.getByRole('button', { name: 'Đổi ghế' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Ngồi đây' }).click();
    await expect.poll(() => avatarSeat(page)).toBe('seat-right');
  });

  test('keyboard: focus starts on "Ngồi đây", Tab reaches every action, Escape closes', async ({ page }) => {
    await gotoCafe(page);
    await chooseSeat(page, 'seat-left');
    await expect(page.getByRole('button', { name: 'Ngồi đây' })).toBeFocused();
    const seen = new Set<string>();
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      seen.add(await page.evaluate(() => document.activeElement?.textContent?.trim() ?? ''));
    }
    expect([...seen]).toEqual(expect.arrayContaining(['×', 'Đổi ghế']));
    await page.keyboard.press('Escape');
    await expect(app(page)).toHaveAttribute('data-selected-seat', 'none');
  });

  test('tapping the table or empty pavement selects nothing', async ({ page }) => {
    await gotoCafe(page);
    const left = await seatPoint(page, 'seat-left');
    const table = { x: left.x + 140, y: left.y - 20 }; // table top, between the chairs
    for (const p of [table, { x: 40, y: 820 }, { x: 200, y: 300 }]) {
      await page.mouse.click(p.x, p.y);
      await expect(app(page)).toHaveAttribute('data-selected-seat', 'none');
    }
    await expect(page.getByRole('button', { name: 'Ngồi đây' })).toHaveCount(0);
  });

  test('dragging pans without selecting; seats stay accurate after the pan', async ({ page }) => {
    await gotoCafe(page);
    const before = await page.evaluate(() => window.__cafe!.cameraX());
    const seat = await seatPoint(page, 'seat-left');

    // A drag that starts on the seat must pan, not select it.
    // Drag right so the seat (left half of the screen) stays visible.
    await drag(page, seat, 120);
    await expect(app(page)).toHaveAttribute('data-selected-seat', 'none');
    expect(await page.evaluate(() => window.__cafe!.cameraX())).toBeLessThan(before);

    const moved = await seatPoint(page, 'seat-left');
    expect(moved.x).toBeGreaterThan(seat.x + 80);
    expect(moved.x).toBeLessThan(390);
    await page.mouse.click(moved.x, moved.y);
    await expect(app(page)).toHaveAttribute('data-selected-seat', 'seat-left');
  });
});

const cameraX = (page: Page) => page.evaluate(() => window.__cafe!.cameraX());

/** Records the avatar's screen x on every frame until stopped. */
async function startAvatarSampling(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __samples: number[]; __sampling: boolean };
    w.__samples = [];
    w.__sampling = true;
    const tick = () => {
      if (!w.__sampling) return;
      w.__samples.push(window.__cafe!.avatarScreenPoint().x);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function stopAvatarSampling(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const w = window as unknown as { __samples: number[]; __sampling: boolean };
    w.__sampling = false;
    return w.__samples;
  });
}

for (const vp of [
  { name: '360', width: 360, height: 800 },
  { name: '390', width: 390, height: 844 },
]) {
  test.describe(`camera ${vp.name}px`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: true, isMobile: true });

    test('compact bar: fits, clear hierarchy, chosen chair stays visible', async ({ page }) => {
      await gotoCafe(page);
      for (const id of ['seat-left', 'seat-right'] as const) {
        if (id === 'seat-left') await chooseSeat(page, id);
        else await page.getByRole('button', { name: 'Đổi ghế' }).click();
        await expect(app(page)).toHaveAttribute('data-selected-seat', id);
        await expect.poll(() => page.evaluate(() => window.__cafe!.cameraMoving())).toBe(false);
        const sheet = (await page.getByRole('region', { name: 'Chỗ ngồi' }).boundingBox())!;
        expect(sheet.x).toBeGreaterThanOrEqual(10);
        expect(sheet.x + sheet.width).toBeLessThanOrEqual(vp.width - 10);
        expect(sheet.height).toBeLessThanOrEqual(120);
        // The chair's cushion centre is above the bar, i.e. still visible.
        const chair = await seatPoint(page, id);
        expect(chair.y).toBeLessThan(sheet.y);
        expect(chair.x).toBeGreaterThan(0);
        expect(chair.x).toBeLessThan(vp.width);

        const sw = (await page.getByRole('button', { name: 'Đổi ghế' }).boundingBox())!;
        const sit = (await page.getByRole('button', { name: 'Ngồi đây' }).boundingBox())!;
        const close = (await page.getByRole('button', { name: 'Đóng' }).boundingBox())!;
        for (const b of [sw, sit, close]) {
          expect(b.height).toBeGreaterThanOrEqual(40);
          expect(b.width).toBeGreaterThanOrEqual(40);
          expect(b.x).toBeGreaterThanOrEqual(sheet.x);
          expect(b.x + b.width).toBeLessThanOrEqual(sheet.x + sheet.width);
        }
        expect(sit.width).toBeGreaterThan(sw.width); // primary is the dominant action
        expect(Math.abs(sit.y - sw.y)).toBeLessThan(2); // same row
        expect(sw.x + sw.width).toBeLessThan(sit.x); // no touching
      }
    });

    test('stays still when the chosen chair is already visible', async ({ page }) => {
      await gotoCafe(page);
      const before = await cameraX(page);
      await chooseSeat(page, 'seat-left');
      await page.waitForTimeout(500);
      expect(await cameraX(page)).toBe(before);
    });

    test('follows the avatar on x when switching seats, keeping it on screen', async ({ page }) => {
      await gotoCafe(page);
      await sitAt(page, 'seat-left');
      await page.waitForTimeout(400);
      // The right chair is off-screen: pan to it, choose it, then watch the walk.
      await chooseSeat(page, 'seat-right');
      await startAvatarSampling(page);
      await page.getByRole('button', { name: 'Ngồi đây' }).click();
      await expect.poll(() => avatarSeat(page)).toBe('seat-right');
      await expect.poll(() => page.evaluate(() => window.__cafe!.cameraMoving())).toBe(false);
      // The player's pan left the seated avatar off-screen; once it walks into view it must stay.
      const all = await stopAvatarSampling(page);
      expect(all.length).toBeGreaterThan(5);
      const firstVisible = all.findIndex((x) => x > 0 && x < vp.width);
      expect(firstVisible).toBeGreaterThanOrEqual(0);
      const xs = all.slice(firstVisible);
      for (const x of xs) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(vp.width);
      }
      // Once seated the camera settles and does not keep re-centering.
      const settled = await cameraX(page);
      await page.waitForTimeout(600);
      expect(await cameraX(page)).toBe(settled);

      // And back to the left chair: the avatar stays visible too.
      await chooseSeat(page, 'seat-left');
      await startAvatarSampling(page);
      await page.getByRole('button', { name: 'Ngồi đây' }).click();
      await expect.poll(() => avatarSeat(page)).toBe('seat-left');
      const back = await stopAvatarSampling(page);
      for (const x of back.slice(back.findIndex((v) => v > 0 && v < vp.width))) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(vp.width);
      }
    });

    test('a manual pan to the counter is not pulled back', async ({ page }) => {
      await gotoCafe(page);
      await sitAt(page, 'seat-left');
      await drag(page, { x: vp.width / 2, y: 300 }, 300);
      const panned = await cameraX(page);
      await page.waitForTimeout(800);
      expect(await cameraX(page)).toBe(panned);
    });

    test('manual pans stop exactly at both panorama edges', async ({ page }) => {
      await gotoCafe(page);
      for (let i = 0; i < 6; i++) await drag(page, { x: 40, y: 300 }, vp.width - 60);
      expect(await cameraX(page)).toBe(0);
      for (let i = 0; i < 12; i++) await drag(page, { x: vp.width - 20, y: 300 }, -(vp.width - 60));
      const visible = 3000 - (await cameraX(page));
      expect(visible).toBeCloseTo((vp.width * 1000) / vp.height, 0);
    });

    test('reduced motion still frames the avatar on the right chair', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await gotoCafe(page);
      await sitAt(page, 'seat-right');
      const p = await page.evaluate(() => window.__cafe!.avatarScreenPoint());
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(vp.width);
      expect(await page.evaluate(() => window.__cafe!.cameraMoving())).toBe(false);
    });
  });
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('sits on the left or the right chair (desktop)', async ({ page }) => {
    await gotoCafe(page);
    await sitAt(page, 'seat-left');
    await expect(page.getByRole('status')).toContainText('Ngồi xuống rồi');
    await page.reload();
    await page.waitForFunction(() => Boolean(window.__cafe));
    await sitAt(page, 'seat-right');
  });

  test('changes the selection before confirming (desktop)', async ({ page }) => {
    await gotoCafe(page);
    await chooseSeat(page, 'seat-left');
    await chooseSeat(page, 'seat-right');
    await page.getByRole('button', { name: 'Ngồi đây' }).click();
    await expect.poll(() => avatarSeat(page)).toBe('seat-right');
  });

  test('switches seats while seated, both ways (desktop)', async ({ page }) => {
    await gotoCafe(page);
    await sitAt(page, 'seat-left');
    await sitAt(page, 'seat-right');
    await sitAt(page, 'seat-left');
  });

  test('starts with scene and UI and no errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });

    await gotoCafe(page);
    await expect(page.getByRole('heading', { name: 'Cà Phê Vỉa Hè' })).toBeVisible();
    const canvas = page.getByTestId('cafe-scene').locator('canvas');
    await expect(canvas).toBeVisible();
    expect(await canvas.boundingBox()).toMatchObject({ width: 1440, height: 900 });
    for (const id of ['seat-left', 'seat-right'] as const) {
      const p = await seatPoint(page, id);
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(1440);
    }
    expect(errors).toEqual([]);
  });
});
