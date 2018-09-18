const express = require('express');
const router = express.Router();

const config = require('../config.json');
const fission = require('../service/fission');

router.post('/proxy/controller/v2/functions', (req, res, next) => {

    fission.fnCreate(req.body).then(function(){
        res.send('ok')
    });
});
router.get('/proxy/controller/v2/functions/:name', (req, res, next) => {

    fission.fnDetail(req.params).then(function(resp){
        res.status(200).json(resp);
    });
});
router.put('/proxy/controller/v2/functions/:name', (req, res, next) => {

    fission.fnUpdate(req.body).then(function(resp){
        res.status(200).json(resp);
    });
});

router.post('/proxy/controller/v2/triggers/http', (req, res, next) => {

    fission.triggerHttpCreate(req.body).then(function(resp){
        res.status(200).json(resp);
    });
});
router.get('/proxy/controller/v2/triggers/http', (req, res, next) => {

    fission.triggerHttpList(req.params).then(function(resp){
        res.status(200).json(resp);
    });
});
router.get('/proxy/controller/v2/watches', (req, res, next) => {

    fission.triggerWatchList(req.params).then(function(resp){
        res.status(200).json(resp);
    });
});
router.post('/proxy/controller/v2/watches', (req, res, next) => {

    fission.watchCreate(req.body).then(function(resp){
        res.status(200).json(resp);
    });
});
module.exports = router;