import Phaser from 'phaser';

const fragShader = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform float uTime;
uniform float uScanlineIntensity;
uniform float uChromaOffset;

varying vec2 outTexCoord;

void main() {
  vec2 uv = outTexCoord;

  // Chromatic aberration — offset R and B channels horizontally
  float r = texture2D(uMainSampler, vec2(uv.x + uChromaOffset, uv.y)).r;
  float g = texture2D(uMainSampler, uv).g;
  float b = texture2D(uMainSampler, vec2(uv.x - uChromaOffset, uv.y)).b;

  vec4 color = vec4(r, g, b, 1.0);

  // Rolling horizontal scanlines
  float scanline = sin((uv.y * 600.0) + uTime * 2.0) * 0.5 + 0.5;
  scanline = pow(scanline, 0.8);
  color.rgb *= 1.0 - (scanline * uScanlineIntensity);

  gl_FragColor = color;
}
`;

export class CRTPostFXPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({
      game,
      name: 'CRTPostFX',
      fragShader,
    });

    this._time = 0;
    this._scanlineIntensity = 0.10;
    this._chromaOffset = 0.0008;
    this._chromaTarget = 0.0008;
    this._chromaDecayTimer = 0;
  }

  onPreRender() {
    this._time += this.game.loop.delta / 1000;

    // Decay chroma back to base
    if (this._chromaDecayTimer > 0) {
      this._chromaDecayTimer -= this.game.loop.delta;
      if (this._chromaDecayTimer <= 0) {
        this._chromaTarget = 0.0008;
      }
    }
    this._chromaOffset += (this._chromaTarget - this._chromaOffset) * 0.1;

    this.set1f('uTime', this._time);
    this.set1f('uScanlineIntensity', this._scanlineIntensity);
    this.set1f('uChromaOffset', this._chromaOffset);
  }

  spikeChroma(amount, durationMs) {
    this._chromaTarget = amount;
    this._chromaDecayTimer = durationMs;
  }
}
