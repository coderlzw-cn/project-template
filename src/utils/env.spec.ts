import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deleteProjectEnvVariable, getProjectEnvVariable, listProjectEnvVariables, setProjectEnvVariable } from './env';

let temporaryDirectory: string;
let envFilePath: string;

beforeEach(async () => {
  temporaryDirectory = await mkdtemp(join(tmpdir(), 'project-env-test-'));
  envFilePath = join(temporaryDirectory, '.env');
  await writeFile(envFilePath, '# project config\nFIRST=one\nSECRET_TOKEN=do-not-expose\nDUPLICATE=old\nDUPLICATE=new\n', 'utf8');
});

afterEach(async () => {
  await rm(temporaryDirectory, { recursive: true, force: true });
});

describe('project .env utils', () => {
  it('lists only variables declared in the target .env and masks secrets', async () => {
    await expect(listProjectEnvVariables(true, envFilePath)).resolves.toEqual([
      { name: 'FIRST', value: 'one', sensitive: false },
      { name: 'SECRET_TOKEN', value: '********', sensitive: true },
      { name: 'DUPLICATE', value: 'new', sensitive: false },
    ]);
  });

  it('creates and reads a value while preserving comments', async () => {
    await expect(setProjectEnvVariable('WITH_SPACE', 'hello world', envFilePath)).resolves.toEqual({
      name: 'WITH_SPACE',
      value: 'hello world',
      sensitive: false,
    });
    await expect(getProjectEnvVariable('WITH_SPACE', true, envFilePath)).resolves.toEqual({
      name: 'WITH_SPACE',
      value: 'hello world',
      sensitive: false,
    });
    await expect(readFile(envFilePath, 'utf8')).resolves.toContain('# project config');
  });

  it('updates the first declaration and removes duplicate declarations', async () => {
    await setProjectEnvVariable('DUPLICATE', 'updated', envFilePath);

    const content = await readFile(envFilePath, 'utf8');
    expect(content.match(/^DUPLICATE=/gm)).toHaveLength(1);
    await expect(getProjectEnvVariable('DUPLICATE', true, envFilePath)).resolves.toEqual({ name: 'DUPLICATE', value: 'updated', sensitive: false });
  });

  it('deletes every declaration of a variable', async () => {
    await expect(deleteProjectEnvVariable('DUPLICATE', envFilePath)).resolves.toBe(true);
    await expect(deleteProjectEnvVariable('DUPLICATE', envFilePath)).resolves.toBe(false);
    await expect(getProjectEnvVariable('DUPLICATE', true, envFilePath)).resolves.toBeUndefined();
  });

  it('supports creating a missing .env file', async () => {
    const missingPath = join(temporaryDirectory, 'missing.env');
    await setProjectEnvVariable('CREATED', 'yes', missingPath);
    await expect(readFile(missingPath, 'utf8')).resolves.toBe('CREATED=yes\n');
  });

  it.each(['', '1INVALID', 'INVALID-NAME', 'INVALID NAME'])('rejects invalid environment variable name %p', async (name) => {
    await expect(getProjectEnvVariable(name, true, envFilePath)).rejects.toThrow(TypeError);
    await expect(setProjectEnvVariable(name, 'value', envFilePath)).rejects.toThrow(TypeError);
    await expect(deleteProjectEnvVariable(name, envFilePath)).rejects.toThrow(TypeError);
  });
});
