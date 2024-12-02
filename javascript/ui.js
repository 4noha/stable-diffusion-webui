// various functions for interaction with ui.py not large enough to warrant putting them in separate files

function set_theme(theme) {
    var gradioURL = window.location.href;
    if (!gradioURL.includes('?__theme=')) {
        window.location.replace(gradioURL + '?__theme=' + theme);
    }
}

function all_gallery_buttons() {
    var allGalleryButtons = gradioApp().querySelectorAll('[style="display: block;"].tabitem div[id$=_gallery].gradio-gallery .thumbnails > .thumbnail-item.thumbnail-small');
    var visibleGalleryButtons = [];
    allGalleryButtons.forEach(function(elem) {
        if (elem.parentElement.offsetParent) {
            visibleGalleryButtons.push(elem);
        }
    });
    return visibleGalleryButtons;
}

function selected_gallery_button() {
    return all_gallery_buttons().find(elem => elem.classList.contains('selected')) ?? null;
}

function selected_gallery_index() {
    return all_gallery_buttons().findIndex(elem => elem.classList.contains('selected'));
}

function gallery_container_buttons(gallery_container) {
    return gradioApp().querySelectorAll(`#${gallery_container} .thumbnail-item.thumbnail-small`);
}

function selected_gallery_index_id(gallery_container) {
    return Array.from(gallery_container_buttons(gallery_container)).findIndex(elem => elem.classList.contains('selected'));
}

function extract_image_from_gallery(gallery) {
    if (gallery.length == 0) {
        return [null];
    }
    if (gallery.length == 1) {
        return [gallery[0]];
    }

    var index = selected_gallery_index();

    if (index < 0 || index >= gallery.length) {
        // Use the first image in the gallery as the default
        index = 0;
    }

    return [gallery[index]];
}

window.args_to_array = Array.from; // Compatibility with e.g. extensions that may expect this to be around

function switch_to_txt2img() {
    gradioApp().querySelector('#tabs').querySelectorAll('button')[0].click();

    return Array.from(arguments);
}

function switch_to_img2img_tab(no) {
    gradioApp().querySelector('#tabs').querySelectorAll('button')[1].click();
    gradioApp().getElementById('mode_img2img').querySelectorAll('button')[no].click();
}
function switch_to_img2img() {
    switch_to_img2img_tab(0);
    return Array.from(arguments);
}

function switch_to_sketch() {
    switch_to_img2img_tab(1);
    return Array.from(arguments);
}

function switch_to_inpaint() {
    switch_to_img2img_tab(2);
    return Array.from(arguments);
}

function switch_to_inpaint_sketch() {
    switch_to_img2img_tab(3);
    return Array.from(arguments);
}

function switch_to_extras() {
    gradioApp().querySelector('#tabs').querySelectorAll('button')[2].click();

    return Array.from(arguments);
}

function get_tab_index(tabId) {
    let buttons = gradioApp().getElementById(tabId).querySelector('div').querySelectorAll('button');
    for (let i = 0; i < buttons.length; i++) {
        if (buttons[i].classList.contains('selected')) {
            return i;
        }
    }
    return 0;
}

function create_tab_index_args(tabId, args) {
    var res = Array.from(args);
    res[0] = get_tab_index(tabId);
    return res;
}

function get_img2img_tab_index() {
    let res = Array.from(arguments);
    res.splice(-2);
    res[0] = get_tab_index('mode_img2img');
    return res;
}

function create_submit_args(args) {
    var res = Array.from(args);

    // As it is currently, txt2img and img2img send back the previous output args (txt2img_gallery, generation_info, html_info) whenever you generate a new image.
    // This can lead to uploading a huge gallery of previously generated images, which leads to an unnecessary delay between submitting and beginning to generate.
    // I don't know why gradio is sending outputs along with inputs, but we can prevent sending the image gallery here, which seems to be an issue for some.
    // If gradio at some point stops sending outputs, this may break something
    if (Array.isArray(res[res.length - 3])) {
        res[res.length - 3] = null;
    }

    return res;
}

function setSubmitButtonsVisibility(tabname, showInterrupt, showSkip, showInterrupting) {
    gradioApp().getElementById(tabname + '_interrupt').style.display = showInterrupt ? "block" : "none";
    gradioApp().getElementById(tabname + '_skip').style.display = showSkip ? "block" : "none";
    gradioApp().getElementById(tabname + '_interrupting').style.display = showInterrupting ? "block" : "none";
}

function showSubmitButtons(tabname, show) {
    setSubmitButtonsVisibility(tabname, !show, !show, false);
}

function showSubmitInterruptingPlaceholder(tabname) {
    setSubmitButtonsVisibility(tabname, false, true, true);
}

function showRestoreProgressButton(tabname, show) {
    var button = gradioApp().getElementById(tabname + "_restore_progress");
    if (!button) return;
    button.style.setProperty('display', show ? 'flex' : 'none', 'important');
}

function submit() {
    showSubmitButtons('txt2img', false);

    var id = randomId();
    localSet("txt2img_task_id", id);

    requestProgress(id, gradioApp().getElementById('txt2img_gallery_container'), gradioApp().getElementById('txt2img_gallery'), function() {
        showSubmitButtons('txt2img', true);
        localRemove("txt2img_task_id");
        showRestoreProgressButton('txt2img', false);
    });

    var res = create_submit_args(arguments);

    res[0] = id;

    return res;
}

function submit_txt2img_upscale() {
    var res = submit(...arguments);

    res[2] = selected_gallery_index();

    return res;
}

function submit_img2img() {
    showSubmitButtons('img2img', false);

    var id = randomId();
    localSet("img2img_task_id", id);

    requestProgress(id, gradioApp().getElementById('img2img_gallery_container'), gradioApp().getElementById('img2img_gallery'), function() {
        showSubmitButtons('img2img', true);
        localRemove("img2img_task_id");
        showRestoreProgressButton('img2img', false);
    });

    var res = create_submit_args(arguments);

    res[0] = id;
    res[1] = get_tab_index('mode_img2img');

    return res;
}

function submit_extras() {
    showSubmitButtons('extras', false);

    var id = randomId();

    requestProgress(id, gradioApp().getElementById('extras_gallery_container'), gradioApp().getElementById('extras_gallery'), function() {
        showSubmitButtons('extras', true);
    });

    var res = create_submit_args(arguments);

    res[0] = id;

    console.log(res);
    return res;
}

function restoreProgressTxt2img() {
    showRestoreProgressButton("txt2img", false);
    var id = localGet("txt2img_task_id");

    if (id) {
        showSubmitInterruptingPlaceholder('txt2img');
        requestProgress(id, gradioApp().getElementById('txt2img_gallery_container'), gradioApp().getElementById('txt2img_gallery'), function() {
            showSubmitButtons('txt2img', true);
        }, null, 0);
    }

    return id;
}

function restoreProgressImg2img() {
    showRestoreProgressButton("img2img", false);

    var id = localGet("img2img_task_id");

    if (id) {
        showSubmitInterruptingPlaceholder('img2img');
        requestProgress(id, gradioApp().getElementById('img2img_gallery_container'), gradioApp().getElementById('img2img_gallery'), function() {
            showSubmitButtons('img2img', true);
        }, null, 0);
    }

    return id;
}


/**
 * Configure the width and height elements on `tabname` to accept
 * pasting of resolutions in the form of "width x height".
 */
function setupResolutionPasting(tabname) {
    var width = gradioApp().querySelector(`#${tabname}_width input[type=number]`);
    var height = gradioApp().querySelector(`#${tabname}_height input[type=number]`);
    for (const el of [width, height]) {
        el.addEventListener('paste', function(event) {
            var pasteData = event.clipboardData.getData('text/plain');
            var parsed = pasteData.match(/^\s*(\d+)\D+(\d+)\s*$/);
            if (parsed) {
                width.value = parsed[1];
                height.value = parsed[2];
                updateInput(width);
                updateInput(height);
                event.preventDefault();
            }
        });
    }
}

onUiLoaded(function() {
    showRestoreProgressButton('txt2img', localGet("txt2img_task_id"));
    showRestoreProgressButton('img2img', localGet("img2img_task_id"));
    setupResolutionPasting('txt2img');
    setupResolutionPasting('img2img');
});


function modelmerger() {
    var id = randomId();
    requestProgress(id, gradioApp().getElementById('modelmerger_results_panel'), null, function() {});

    var res = create_submit_args(arguments);
    res[0] = id;
    return res;
}


function ask_for_style_name(_, prompt_text, negative_prompt_text) {
    var name_ = prompt('Style name:');
    return [name_, prompt_text, negative_prompt_text];
}

function confirm_clear_prompt(prompt, negative_prompt) {
    if (confirm("Delete prompt?")) {
        prompt = "";
        negative_prompt = "";
    }

    return [prompt, negative_prompt];
}


var opts = {};
onAfterUiUpdate(function() {
    if (Object.keys(opts).length != 0) return;

    var json_elem = gradioApp().getElementById('settings_json');
    if (json_elem == null) return;

    var textarea = json_elem.querySelector('textarea');
    var jsdata = textarea.value;
    opts = JSON.parse(jsdata);

    executeCallbacks(optionsAvailableCallbacks); /*global optionsAvailableCallbacks*/
    executeCallbacks(optionsChangedCallbacks); /*global optionsChangedCallbacks*/

    Object.defineProperty(textarea, 'value', {
        set: function(newValue) {
            var valueProp = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
            var oldValue = valueProp.get.call(textarea);
            valueProp.set.call(textarea, newValue);

            if (oldValue != newValue) {
                opts = JSON.parse(textarea.value);
            }

            executeCallbacks(optionsChangedCallbacks);
        },
        get: function() {
            var valueProp = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
            return valueProp.get.call(textarea);
        }
    });

    json_elem.parentElement.style.display = "none";
});

onOptionsChanged(function() {
    var elem = gradioApp().getElementById('sd_checkpoint_hash');
    var sd_checkpoint_hash = opts.sd_checkpoint_hash || "";
    var shorthash = sd_checkpoint_hash.substring(0, 10);

    if (elem && elem.textContent != shorthash) {
        elem.textContent = shorthash;
        elem.title = sd_checkpoint_hash;
        elem.href = "https://google.com/search?q=" + sd_checkpoint_hash;
    }

    
    // for Licence check
    var model_list = {
        "e869ac7d6942cb327d68d5ed83a40447aadf20e0c3358d98b2cc9e270db0da26": {
            "name": "stabilityai/sdxl-turbo",
            "uri": "https://huggingface.co/stabilityai/sdxl-turbo",
            "version": "1.0fp16",
            "filename": "sd_xl_turbo_1.0_fp16.safetensors",
            "licence": "SDXL-Turbo License" },
        "31e35c80fc4829d14f90153f4c74cd59c90b779f6afe05a74cd6120b893f7e5b": {
            "name": "stabilityai/stable-diffusion-xl-base-1.0",
            "uri": "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0",
            "version": "1.0",
            "filename": "sd_xl_base_1.0.safetensors",
            "licence": "CreativeML Open RAIL++-M License" },
        "1a189f0be69d6106a48548e7626207dddd7042a418dbf372cefd05e0cdba61b6": {
            "name": "stable-diffusion-v1-5/stable-diffusion-v1-5",
            "uri": "https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5",
            "version": "1.5-pruned",
            "filename": "v1-5-pruned.safetensors",
            "licence": "CreativeML Open RAIL-M license" },
        "6ce0161689b3853acaa03779ec93eafe75a02f4ced659bee03f50797806fa2fa": {
            "name": "stable-diffusion-v1-5/stable-diffusion-v1-5",
            "uri": "https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5",
            "version": "1.5-pruned-emaonly",
            "filename": "v1-5-pruned.safetensors",
            "licence": "CreativeML Open RAIL-M license" },
        "aa54192e22483438f4032b87b1f22d98705f7f2ce2dd4e0cfa6bcf70d3bed258": {
            "name": "AingDiffusion",
            "uri": "https://civitai.com/models/34553",
            "version": "11.3",
            "filename": "34553.safetensors",
            "licence": "CreativeML Open RAIL-M license" },
        "d4620223b4f1694e9284826edee9c3750a3aa2a2e1a2624c6f4b46777d72dd30": {
            "name": "规则深背景/A Regular Deep Background/奥行のあるいつもの背景",
            "uri": "https://civitai.com/models/113262",
            "version": "1.0",
            "filename": "113262.safetensor",
            "licence": "CreativeML Open RAIL-M license" },
        "1a17bcd93dc12034b4b8e6b2787f34a7ca250fb3344cb036768d3525745adb8c": {
            "name": "Beautiful Realistic Asians",
            "uri": "https://civitai.com/models/25494",
            "version": "7",
            "filename": "25494.safetensors",
            "licence": "CreativeML Open RAIL-M license" },
        "a310b4c195d6c388398ac8a57c6b197fc1d0f4d8db051a9b06b900f902670241": {
            "name": "CounterfeitXL",
            "uri": "https://civitai.com/models/118406",
            "version": "2.5",
            "filename": "118406.safetensors",
            "licence": "CreativeML Open RAIL++-M License" },
        "62ccb8fe414a86643ba72d8590cb2f55d93080aa1eb2f7c3519e81b5c0be0a9d": {
            "name": "kaodiiLandscapeMix - day",
            "uri": "https://civitai.com/models/92321",
            "version": "1.0",
            "filename": "92321.safetensors",
            "licence": "CreativeML Open RAIL-M license" },
        "61bea4195201870bcd2c7002de9922772b32db6add8380e8e17d4dd6d8869307": {
            "name": "kaodiiLandscapeMix - night",
            "uri": "https://civitai.com/models/94097",
            "version": "1.0",
            "filename": "94097.safetensors",
            "licence": "CreativeML Open RAIL-M license" },
        "9fd745b262fd0253a1bf7a0d70faa2bcc12d1ec2ba7b921c30f733ba41ad8aba": {
            "name": "MomijiMix",
            "uri": "https://civitai.com/models/176410",
            "version": "4.0",
            "filename": "176410.safetonsors",
            "licence": "CreativeML Open RAIL-M license" }
    };
    var licence_list = {
        "SDXL-Turbo License": {
            "uri": "https://stability.ai/license",
            "usable": "商用利用は要契約",
            "adult": "-",
            "commercially": "-"
        },
        "CreativeML Open RAIL++-M License": {
            "uri": "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/blob/main/LICENSE.md",
            "usable": "🙆",
            "adult": "-",
            "commercially": "-"
        },
        "CreativeML Open RAIL-M license": {
            "uri": "https://huggingface.co/spaces/CompVis/stable-diffusion-license",
            "usable": "🙆",
            "adult": "true",
            "commercially": "true"
        }
    };

    var version_elem = gradioApp().getElementById('model_version');
    if (version_elem) {
        var model_data = model_list[sd_checkpoint_hash];
        if (model_data) {
            version_elem.textContent = model_data['name'] + '-v' + model_data['version'];
            version_elem.title = model_data['name'];
            version_elem.href = model_data['uri'];
        } else {
            version_elem.textContent = "未登録モデル❌️";
            version_elem.title = "";
            version_elem.href = "";
        }
    }

    var licence_elem = gradioApp().getElementById('sd_lisence');
    if (licence_elem) {
        var model_data = model_list[sd_checkpoint_hash];
        if (model_data && licence_list[model_data['licence']]) {
            var licence = licence_list[model_data['licence']];
            licence_elem.textContent = model_data['licence'] + ( licence['usable'] ? '🙆‍♀️' : '❌️' );
            licence_elem.title = model_data['licence'];
            licence_elem.href = licence["uri"];
        } else {
            licence_elem.textContent = "要調査❌️";
            licence_elem.title = "";
            licence_elem.href = "";
        }
    }
});

let txt2img_textarea, img2img_textarea = undefined;

function restart_reload() {
    document.body.style.backgroundColor = "var(--background-fill-primary)";
    document.body.innerHTML = '<h1 style="font-family:monospace;margin-top:20%;color:lightgray;text-align:center;">Reloading...</h1>';
    var requestPing = function() {
        requestGet("./internal/ping", {}, function(data) {
            location.reload();
        }, function() {
            setTimeout(requestPing, 500);
        });
    };

    setTimeout(requestPing, 2000);

    return [];
}

// Simulate an `input` DOM event for Gradio Textbox component. Needed after you edit its contents in javascript, otherwise your edits
// will only visible on web page and not sent to python.
function updateInput(target) {
    let e = new Event("input", {bubbles: true});
    Object.defineProperty(e, "target", {value: target});
    target.dispatchEvent(e);
}


var desiredCheckpointName = null;
function selectCheckpoint(name) {
    desiredCheckpointName = name;
    gradioApp().getElementById('change_checkpoint').click();
}

function currentImg2imgSourceResolution(w, h, scaleBy) {
    var img = gradioApp().querySelector('#mode_img2img > div[style="display: block;"] img');
    return img ? [img.naturalWidth, img.naturalHeight, scaleBy] : [0, 0, scaleBy];
}

function updateImg2imgResizeToTextAfterChangingImage() {
    // At the time this is called from gradio, the image has no yet been replaced.
    // There may be a better solution, but this is simple and straightforward so I'm going with it.

    setTimeout(function() {
        gradioApp().getElementById('img2img_update_resize_to').click();
    }, 500);

    return [];

}



function setRandomSeed(elem_id) {
    var input = gradioApp().querySelector("#" + elem_id + " input");
    if (!input) return [];

    input.value = "-1";
    updateInput(input);
    return [];
}

function switchWidthHeight(tabname) {
    var width = gradioApp().querySelector("#" + tabname + "_width input[type=number]");
    var height = gradioApp().querySelector("#" + tabname + "_height input[type=number]");
    if (!width || !height) return [];

    var tmp = width.value;
    width.value = height.value;
    height.value = tmp;

    updateInput(width);
    updateInput(height);
    return [];
}


var onEditTimers = {};

// calls func after afterMs milliseconds has passed since the input elem has been edited by user
function onEdit(editId, elem, afterMs, func) {
    var edited = function() {
        var existingTimer = onEditTimers[editId];
        if (existingTimer) clearTimeout(existingTimer);

        onEditTimers[editId] = setTimeout(func, afterMs);
    };

    elem.addEventListener("input", edited);

    return edited;
}
