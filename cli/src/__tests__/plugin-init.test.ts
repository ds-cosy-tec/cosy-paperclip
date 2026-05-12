import path from "node:path";
import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  scaffoldPluginProject: vi.fn((options: { outputDir: string }) => options.outputDir),
}));

vi.mock("@paperclipai/create-paperclip-plugin", () => ({
  scaffoldPluginProject: mocks.scaffoldPluginProject,
}));

import {
  buildPluginInitNextCommands,
  buildPluginInitScaffoldOptions,
  registerPluginCommands,
} from "../commands/client/plugin.js";

describe("plugin init", () => {
  beforeEach(() => {
    mocks.scaffoldPluginProject.mockClear();
  });

  it("maps package name and flags to scaffolder options", () => {
    const cwd = path.resolve("/tmp/paperclip-cli-test");
    const options = buildPluginInitScaffoldOptions(
      "@acme/plugin-linear",
      {
        output: "plugins",
        template: "connector",
        category: "automation",
        displayName: "Linear Bridge",
        description: "Syncs Linear issues",
        author: "Acme",
        sdkPath: "../paperclip/packages/plugins/sdk",
      },
      cwd,
    );

    expect(options).toEqual({
      pluginName: "@acme/plugin-linear",
      outputDir: path.resolve(cwd, "plugins", "plugin-linear"),
      template: "connector",
      category: "automation",
      displayName: "Linear Bridge",
      description: "Syncs Linear issues",
      author: "Acme",
      sdkPath: "../paperclip/packages/plugins/sdk",
    });
  });

  it("builds exact next commands using the scaffold path", () => {
    expect(buildPluginInitNextCommands("/tmp/acme plugin")).toEqual([
      "cd '/tmp/acme plugin'",
      "pnpm install",
      "pnpm dev",
      "paperclipai plugin install '/tmp/acme plugin'",
    ]);
  });

  it("registers the CLI wrapper and invokes the existing scaffolder", async () => {
    const program = new Command();
    program.exitOverride();
    program.configureOutput({ writeOut: () => {}, writeErr: () => {} });
    registerPluginCommands(program);

    await program.parseAsync(
      [
        "plugin",
        "init",
        "demo-plugin",
        "--output",
        "/tmp/paperclip-init-output",
        "--template",
        "workspace",
        "--category",
        "workspace",
        "--display-name",
        "Demo Plugin",
        "--description",
        "Demo description",
        "--author",
        "Paperclip",
        "--sdk-path",
        "/repo/packages/plugins/sdk",
      ],
      { from: "user" },
    );

    expect(mocks.scaffoldPluginProject).toHaveBeenCalledTimes(1);
    expect(mocks.scaffoldPluginProject).toHaveBeenCalledWith({
      pluginName: "demo-plugin",
      outputDir: path.resolve("/tmp/paperclip-init-output", "demo-plugin"),
      template: "workspace",
      category: "workspace",
      displayName: "Demo Plugin",
      description: "Demo description",
      author: "Paperclip",
      sdkPath: "/repo/packages/plugins/sdk",
    });
  });
});
