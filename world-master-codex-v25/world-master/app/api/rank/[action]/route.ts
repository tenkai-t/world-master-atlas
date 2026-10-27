import { env } from 'cloudflare:workers';
import { rankingRequest } from '../../../../server/ranking.mjs';
import country from '../../../../public/assets/data.json';
import capital from '../../../../public/assets/capitals.json';
import terrain from '../../../../public/assets/terrain.json';
import heritage from '../../../../public/assets/heritage.json';
import icons from '../../../../public/assets/player-icons.json';
const bank={country,capital,terrain,heritage,icons};
async function handle(request:Request,ctx:{params:Promise<{action:string}>}){const {action}=await ctx.params;return rankingRequest(request,action,(env as any).DB,bank,request.headers.get('oai-authenticated-user-id'));}
export const GET=handle;export const POST=handle;
