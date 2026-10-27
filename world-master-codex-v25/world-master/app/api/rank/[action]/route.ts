import { env } from 'cloudflare:workers';
import { rankingGateway } from '../../../../server/ranking-gateway.mjs';
import country from '../../../../public/assets/data.json';
import capital from '../../../../public/assets/capitals.json';
import terrain from '../../../../public/assets/terrain.json';
import heritage from '../../../../public/assets/heritage.json';
import icons from '../../../../public/assets/player-icons.json';
const bank={country,capital,terrain,heritage,icons};
async function handle(request:Request,ctx:{params:Promise<{action:string}>}){const {action}=await ctx.params;return rankingGateway(request,action,env,bank);}
export const GET=handle;export const POST=handle;
