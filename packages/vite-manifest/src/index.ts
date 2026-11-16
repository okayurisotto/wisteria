/*
 * Viteにおいて、チャンクにはおおまかに4種類ある。
 *
 * 1. Entry chunk
 * 2. Dynamic entry chunk
 * 3. 通常のchunk
 * 4. Assets / CSS
 *
 * しかし、これらを見分ける明確な方法（`type`プロパティなど）は提供されていない。
 * どのチャンクがどういった役割を持ち、どのように読み込む必要があるのか、
 * もしくは自動的に読み込まれるためマニュアルでの読み込みが必要ないのかは、明確でない。
 */

export type * from './type.js';
export * from './getFrontendData.js';
export * from './parseManifest.js';
