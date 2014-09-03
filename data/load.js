/**
 * Created by svenc on 30/07/14.
 */


var _dataCallback;
var __data = undefined;

function load(callback)
{
    _dataCallback = callback;
    loadData();

}
function loadData()
{
        $.getJSON('../data/moocrp.json', data_loading_done, "json");
}

function data_loading_done(d)
{
    __data = d;
    _dataCallback();
}

