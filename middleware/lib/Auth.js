"use strict"
import {yoyowSDK} from './yoyow-node-sdk';
import config from '../conf/config';
import {SignObj, VerifyObj} from './entity';
import api from './Api';

var {PublicKey, Signature, ChainStore, PrivateKey} = yoyowSDK;

/**
 * 授权相关操作
 */
class Auth {
    constructor(){}

    /**
     * 签名
     * @param {String} type 签名类型 platform 或 yoyow
     * @param {Number|String} uid yoyow账户id
     * @param {String} key 零钱密钥
     * @returns {Promise<PageWrapper>|Promise.<T>|*|Promise} resolve(signObj 签名对象), reject(e 异常信息)
     */
    sign(type, uid, key){
        return new Promise((resolve, reject) => {
            if(type != 'platform' && type != 'yoyow'){
                reject({code: 1001, message: '无效的签名类型'});
            }

            let time = (new Date()).getTime().toString()
            let sendObj = {
                "time": time
            }
            sendObj[type] = config.platform_id;
            let strObj = JSON.stringify(sendObj);
            let signed = Signature.sign(strObj, PrivateKey.fromWif(key));
            resolve(new SignObj(signed.toHex(), time, uid));
        });
    }

    /**
     * 验证签名
     * @param {String} type 验签类型 platform 或 yoyow
     * @param {String} sign 验签对象
     * @param {Number} time 签名时间
     * @param {Number|String} uid yoyow账户id
     * @returns {Promise<PageWrapper>|Promise.<T>|*|Promise} resolve(verifyObj 签名验证对象), reject(e 异常信息)
     */
    verify(type, sign, time, uid){
        return new Promise((resolve, reject) => {
            if(type != 'platform' && type != 'yoyow'){
                reject({code: 1001, message: '无效的签名类型'});
            }else if(isNaN(Number(time)) && Object.prototype.toString.call(time) !== '[object Number'){
                reject({code: 1002, message: '无效的签名时间'});
            }else{
                return api.getAccount(uid).then(uObj => {
                    let cur = (new Date()).getTime();
                    let req = (new Date(parseInt(time))).getTime();
                    if (cur - req > 2 * 60 * 1000) {//请求时间与当前时间相关2分钟被视为过期
                        reject({code: 1003, message: '请求已经过期'});
                    } else {
                        let secondary = uObj.secondary.key_auths[0][0];
                        let sObj = { time: time };
                        sObj[type] = uid;
                        let pars = JSON.stringify(sObj);
                        let ePkey = PublicKey.fromPublicKeyString(secondary);
                        let verify = Signature.fromHex(sign).verifyBuffer(new Buffer(pars), ePkey);
                        resolve(new VerifyObj(verify, uObj.name));
                    }
                }).catch(e => {
                    reject(e);
                });
            }
        });
    }
}

export default new Auth();