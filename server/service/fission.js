const config = require('../config.json');
const cp = require('child_process');
const fs = require('fs');
const q = require('q');
const request = require('request');

const fnCreate = (params) => {
    let deferred = q.defer();
    let code = new Buffer(params.code, 'base64').toString();
    fs.unlinkSync('temp/script');
    fs.appendFileSync('temp/script', code, 'utf8');
    if(params.environment.name !== "workflow"){
        cp.exec(`./server/fission --server ${config.controllerBackend} function create --name ${params.metadata.name} --env ${params.environment.name} --code temp/script`, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return;
                deferred.reject(err);
            }
            deferred.resolve('ok');
        });
    }
    else if(params.environment.name === "workflow"){
        cp.exec(`./server/fission --server ${config.controllerBackend} function create --name ${params.metadata.name} --env ${params.environment.name} --src temp/script`, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return;
                deferred.reject(err);
            }
            deferred.resolve('ok');
        });
    }
    
    return deferred.promise;
};

const fnUpdate = (params) => {
    let deferred = q.defer();
    let code = new Buffer(params.code, 'base64').toString();
    fs.unlinkSync('temp/script');
    fs.appendFileSync('temp/script', code, 'utf8');
    if(params.environment.name !== "workflow"){
        cp.exec(`./server/fission --server ${config.controllerBackend} function update --name ${params.metadata.name} --env ${params.environment.name} --code temp/script`, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return;
                deferred.reject(err);
            }
            deferred.resolve('ok');
        });
    }
    else if(params.environment.name === "workflow"){
        cp.exec(`./server/fission --server ${config.controllerBackend} function update --name ${params.metadata.name} --env ${params.environment.name} --src temp/script`, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return;
                deferred.reject(err);
            }
            deferred.resolve('ok');
        });
    }
    
    return deferred.promise;
};


const fnDetail = (params) => {
    let resp = {
        metadata: {
            name: params.name
        },
        environment: {
        }
    };
    let functionName = params.name;
    let deferred = q.defer();
    let opt = {
        method: 'get',
        url: `http://${config.controllerBackend}/v2/functions/${functionName}`
    };
    
    request(opt, (e, r, body) => {
        let bodyObject;
        if(!e){
            bodyObject = JSON.parse(body);
        }
        else{
            deferred.reject(e);
        }
        
        resp.environment.name = bodyObject.spec.environment.name;
        let packageName = bodyObject.spec.package.packageref.name;
        let reqOpt = {
            method: 'get',
            url:  `http://${config.controllerBackend}/v2/packages/${packageName}`
        };
        request(reqOpt, (err, response, responseBody) => {
            let bodyO;
            if(!err){
                bodyO = JSON.parse(responseBody);
            }
            else{
                deferred.reject(err);
            }
            resp.code = bodyO.spec.deployment.literal || bodyO.spec.source.literal || "W2JpbmFyeSBmaWxlXQ==";
            deferred.resolve(resp);
            console.log(bodyO);
        })
    });
    return deferred.promise;
};
const triggerHttpCreate = function(params){
    let deferred = q.defer();
    cp.exec(`./server/fission --server ${config.controllerBackend} ht create --method ${params.method} --url ${params.urlpattern} --function ${params.function.name}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            deferred.reject(err);
            return;
        }
        deferred.resolve('ok');
    });
    return deferred.promise;
};
const triggerHttpList = function(params){
    let deferred = q.defer();
    let opt = {
        method: 'get',
        url: `http://${config.controllerBackend}/v2/triggers/http`
    };
    request(opt,function(e, r, body){
        let resp;
        if(!e){
            resp = JSON.parse(body);
        }
        else{
            deferred.reject(err);
            return;
        }
        console.log(resp);
        let list = [];
        for(let httpTrigger of resp){
            list.push({
                metadata: {
                    name: httpTrigger.metadata.name
                },
                function: {
                    name: httpTrigger.spec.functionref.name
                },
                method: httpTrigger.spec.method,
                urlpattern: httpTrigger.spec.relativeurl
            });
        }
        deferred.resolve(list);
    });
    return deferred.promise;
};
const watchCreate = function(params){
    let deferred = q.defer();
    console.log(`./server/fission --server ${config.controllerBackend} watch create --function ${params.function.name} --type ${params.objtype} --labels ${params.labelselector}`);
    cp.exec(`./server/fission --server ${config.controllerBackend} watch create --function ${params.function.name} --type ${params.objtype} --labels ${params.labelselector}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            deferred.reject(err);
            return;
        }
        deferred.resolve('ok');
    });
    return deferred.promise;
};
const triggerWatchList = function(params){
    let deferred = q.defer();
    let opt = {
        method: 'get',
        url: `http://${config.controllerBackend}/v2/watches`
    };
    request(opt,function(e, r, body){
        console.log('body:', body)
        let resp;
        if(!e){
            resp = JSON.parse(body);
        }
        else{
            deferred.reject(err);
            return;
        }
        console.log(resp);
        let list = [];
        for(let watch of resp){
            list.push({
                metadata: {
                    name: watch.metadata.name
                },
                function: {
                    name: watch.spec.functionref.name
                },
                labelselector: watch.spec.labelselector,
                objtype: watch.spec.type,
                namespace: watch.spec.namespace
            });
        }
        deferred.resolve(list);
    });
    return deferred.promise;
};
module.exports = {
    fnCreate: fnCreate,
    fnDetail: fnDetail,
    triggerHttpCreate: triggerHttpCreate,
    triggerHttpList: triggerHttpList,
    watchCreate: watchCreate,
    triggerWatchList: triggerWatchList,
    fnUpdate: fnUpdate
};