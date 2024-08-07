import { CommandContext, Context } from "grammy";

export async function start(ctx: CommandContext<Context>) {
  const userId = ctx.chat?.id as number;
}
