import { ResolvedScene, ResolvedClip, RenderCache } from './types';
import { calculateAnimationTransform } from './animations';
import { calculateTransitionBlend } from './transitions';

type CanvasContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * Draws an ImageBitmap with cover crop or contain pillarbox/letterbox and transform.
 */
function drawTransformedImage(
  ctx: CanvasContext,
  bitmap: ImageBitmap,
  fit: 'cover' | 'contain',
  transform: { scale: number; translateX: number; translateY: number },
  canvasWidth: number,
  canvasHeight: number,
  alpha = 1.0
): void {
  ctx.save();
  ctx.globalAlpha = alpha;

  const { scale, translateX, translateY } = transform;
  const imageAspect = bitmap.width / bitmap.height;
  const canvasAspect = canvasWidth / canvasHeight;

  let drawW = canvasWidth;
  let drawH = canvasHeight;

  if (fit === 'cover') {
    if (imageAspect > canvasAspect) {
      // Image is wider than canvas: match height, crop width
      drawH = canvasHeight;
      drawW = canvasHeight * imageAspect;
    } else {
      // Image is taller than canvas: match width, crop height
      drawW = canvasWidth;
      drawH = canvasWidth / imageAspect;
    }
  } else {
    // Contain (letterbox / pillarbox)
    if (imageAspect > canvasAspect) {
      drawW = canvasWidth;
      drawH = canvasWidth / imageAspect;
    } else {
      drawH = canvasHeight;
      drawW = canvasHeight * imageAspect;
    }
  }

  // Apply transform centered at canvas midpoint
  ctx.translate(canvasWidth / 2 + translateX, canvasHeight / 2 + translateY);
  ctx.scale(scale, scale);

  ctx.drawImage(bitmap, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

/**
 * Renders fallback placeholder when asset bitmap is still loading or absent.
 */
function drawPlaceholder(
  ctx: CanvasContext,
  clip: ResolvedClip,
  canvasWidth: number,
  canvasHeight: number,
  alpha = 1.0
): void {
  ctx.save();
  ctx.globalAlpha = alpha;

  // Background subtle block
  ctx.fillStyle = '#18181B';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Border frame
  ctx.strokeStyle = '#27272A';
  ctx.lineWidth = 4;
  ctx.strokeRect(16, 16, canvasWidth - 32, canvasHeight - 32);

  // Center text
  ctx.fillStyle = '#A1A1AA';
  ctx.font = `600 ${Math.max(16, Math.round(canvasHeight * 0.04))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Beat #${clip.index + 1}`, canvasWidth / 2, canvasHeight / 2 - 12);

  ctx.font = `400 ${Math.max(12, Math.round(canvasHeight * 0.025))}px monospace`;
  ctx.fillStyle = '#71717A';
  ctx.fillText(
    `Clip ${clip.clip.id} (${(clip.durationMs / 1000).toFixed(1)}s)`,
    canvasWidth / 2,
    canvasHeight / 2 + 18
  );

  ctx.restore();
}

/**
 * The single, authoritative canvas frame renderer for Kompanion.
 * Zero React/DOM imports. Used identically by Preview Player and Export Worker.
 */
export function renderFrame(
  ctx: CanvasContext,
  scene: ResolvedScene,
  tMs: number,
  cache: RenderCache
): void {
  const { width: W, height: H, clips } = scene;

  // 1. Clear background to dark canvas
  ctx.save();
  ctx.fillStyle = '#0A0A0C';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  if (clips.length === 0) return;

  const clampedTime = Math.max(0, Math.min(scene.durationMs, Math.round(tMs)));

  // 2. Find active clip
  let activeIndex = clips.findIndex(
    (c) => clampedTime >= c.startMs && clampedTime < c.endMs
  );

  // If playhead is at the exact end of timeline, clamp to last clip
  if (activeIndex === -1) {
    activeIndex = clips.length - 1;
  }

  const currentClip = clips[activeIndex]!;
  const currentAsset = scene.assets.get(currentClip.clip.assetId);
  const currentBitmap = currentAsset ? cache.getBitmap(currentAsset.id, W) : null;

  // Normalized progress within current clip [0, 1]
  const p = Math.max(
    0,
    Math.min(1, (clampedTime - currentClip.startMs) / currentClip.durationMs)
  );

  const currentTransform = calculateAnimationTransform(
    currentClip.resolvedAnimation,
    p,
    currentClip.index,
    W,
    H
  );

  // 3. Evaluate Transition-In from previous clip
  const transitionBlend = calculateTransitionBlend(
    currentClip.resolvedTransitionIn,
    clampedTime,
    currentClip.startMs
  );

  if (transitionBlend.isTransitioning && activeIndex > 0) {
    const prevClip = clips[activeIndex - 1]!;
    const prevAsset = scene.assets.get(prevClip.clip.assetId);
    const prevBitmap = prevAsset ? cache.getBitmap(prevAsset.id, W) : null;

    // Previous clip is evaluated at the end of its duration (progress = 1.0)
    const prevTransform = calculateAnimationTransform(
      prevClip.resolvedAnimation,
      1.0,
      prevClip.index,
      W,
      H
    );

    // Render outgoing clip
    if (transitionBlend.outgoingAlpha > 0) {
      if (prevBitmap) {
        drawTransformedImage(
          ctx,
          prevBitmap,
          prevClip.clip.fit,
          prevTransform,
          W,
          H,
          transitionBlend.outgoingAlpha
        );
      } else {
        drawPlaceholder(ctx, prevClip, W, H, transitionBlend.outgoingAlpha);
      }
    }

    // Render incoming clip
    if (transitionBlend.incomingAlpha > 0) {
      if (currentBitmap) {
        drawTransformedImage(
          ctx,
          currentBitmap,
          currentClip.clip.fit,
          currentTransform,
          W,
          H,
          transitionBlend.incomingAlpha
        );
      } else {
        drawPlaceholder(ctx, currentClip, W, H, transitionBlend.incomingAlpha);
      }
    }

    // Dip-to-black overlay if active
    if (transitionBlend.blackOverlayAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = transitionBlend.blackOverlayAlpha;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  } else {
    // Normal single-clip rendering
    if (currentBitmap) {
      drawTransformedImage(ctx, currentBitmap, currentClip.clip.fit, currentTransform, W, H, 1.0);
    } else {
      drawPlaceholder(ctx, currentClip, W, H, 1.0);
    }
  }
}
