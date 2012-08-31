/* Copyright (c) UNC Chapel Hill University Library, created by Hugh A. Cayless
 * and revised by J. Clifford Dyer.  Published under the Clear BSD licence.  
 * See http://svn.openlayers.org/trunk/openlayers/license.txt for the full 
 * text of the license. 
 */


/**
 * @requires OpenLayers/Layer/Grid.js
 * @requires OpenLayers/Tile/Image.js
 */

/**
 * Class: OpenLayers.Layer.OpenURL
 * 
 * Inherits from:
 *  - <OpenLayers.Layer.Grid>
 */
OpenLayers.Layer.Djatoka = OpenLayers.Class(OpenLayers.Layer.Grid, {

    /**
     * APIProperty: isBaseLayer
     * {Boolean}
     */
    isBaseLayer: true,

    /**
     * Property: standardTileSize
     * {Integer} The size of a standard (non-border) square tile in pixels.
     */
    standardTileSize: 256,

    /** 
     * Property: tileOriginCorner
     * {String} This layer uses top-left as tile origin
     **/
    tileOriginCorner: "tl",
    
    url_ver: 'Z39.88-2004',
    rft_id: null,
    svc_id: "info:lanl-repo/svc/getRegion",
    svc_val_fmt: "info:ofi/fmt:kev:mtx:jpeg2000",
    format: null,
    tileHeight: null,
    tileSize: new OpenLayers.Size(256, 256),
	viewerWidth: 512, 
	viewerHeight: 512, 
	minDjatokaLevelDimension: 48,
	djatokaURL: '/adore-djatoka/resolver',

    /**
     * Constructor: OpenLayers.Layer.OpenURL
     * 
     * Parameters:
     * name - {String}
     * url - {String}
     * options - {Object} Hashtable of extra options to tag onto the layer
     */
    initialize: function(name, url, options) {
        OpenLayers.Layer.Grid.prototype.initialize.apply(this, [
	        name, url, null, {}, options
	    ]);
        //this.initializeZoomify(options);
        this.initializeDjatoka(options);
    },

    initializeZoomify: function(options) {
        this.rft_id = options.rft_id;
        this.format = options.format;
        // Get image metadata if it hasn't been set
        var imgMetadata;
        if (!options.imgMetadata) {
	      // let's not deal with this yet
          // var request = OpenLayers.Request.issue({url: options.metadataUrl, async: false});
          // this.imgMetadata = eval('(' + request.responseText + ')');
        } else {
          imgMetadata = options.imgMetadata;
        }
        var minLevel = this.getMinLevel(imgMetadata);
        var viewerLevel = Math.ceil(Math.min(minLevel, Math.max(
            (Math.log(imgMetadata.width) - Math.log(this.standardTileSize)),
            (Math.log(imgMetadata.height) - Math.log(this.standardTileSize)))/
               Math.log(2)));
	    console.log("viewerLevel " + viewerLevel);
        this.zoomOffset = minLevel - viewerLevel;
	    console.log("this.zoomOffset " + this.zoomOffset);

        this.size = new OpenLayers.Size(imgMetadata.width,imgMetadata.height);
        var imageSize = this.size.clone();
        var tiles = new OpenLayers.Size(
            Math.ceil( imageSize.w / this.standardTileSize ),
            Math.ceil( imageSize.h / this.standardTileSize )
            );

        this.tierSizeInTiles = [tiles];
        this.tierImageSize = [imageSize];

        while (imageSize.w > this.standardTileSize ||
               imageSize.h > this.standardTileSize ) {

            imageSize = new OpenLayers.Size(
                Math.floor( imageSize.w / 2 ),
                Math.floor( imageSize.h / 2 )
                );
            tiles = new OpenLayers.Size(
                Math.ceil( imageSize.w / this.standardTileSize ),
                Math.ceil( imageSize.h / this.standardTileSize )
                );
            this.tierSizeInTiles.push( tiles );
            this.tierImageSize.push( imageSize );
        }

        this.tierSizeInTiles.reverse();
        this.tierImageSize.reverse();
        this.numberOfTiers = this.tierSizeInTiles.length;
        var resolutions = [1];
        this.tileCountUpToTier = [0];
        for (var i = 1; i < this.numberOfTiers; i++) {
            resolutions.unshift(Math.pow(2, i));
            this.tileCountUpToTier.push(
                this.tierSizeInTiles[i-1].w * this.tierSizeInTiles[i-1].h +
                this.tileCountUpToTier[i-1]
                );
        }
        if (!this.serverResolutions) {
            this.serverResolutions = resolutions;
        }
        console.dir(this.serverResolutions)
        console.dir(this.tierImageSize)
    },

    initializeDjatoka: function(options) {
    
        this.rft_id = options.rft_id;
        this.format = options.format;
        // Get image metadata if it hasn't been set
        var imgMetadata;
        if (!options.imgMetadata) {
	      // let's not deal with this yet
          // var request = OpenLayers.Request.issue({url: options.metadataUrl, async: false});
          // this.imgMetadata = eval('(' + request.responseText + ')');
        } else {
          imgMetadata = options.imgMetadata;
        }
        this.size = new OpenLayers.Size(imgMetadata.width,imgMetadata.height);
        
        var minLevel = this.getMinLevel(imgMetadata);
        // viewerLevel is the smallest useful zoom level: i.e., it is the largest level that fits entirely 
        // within the bounds of the viewer div.
        var viewerLevel = Math.ceil(Math.min(minLevel, Math.max(
            (Math.log(imgMetadata.width) - Math.log(this.standardTileSize)),
            (Math.log(imgMetadata.height) - Math.log(this.standardTileSize)))/
               Math.log(2)));
        this.zoomOffset = minLevel - viewerLevel;

        // width at level viewerLevel
        var w = imgMetadata.width / Math.pow(2, viewerLevel);

        // height at level viewerLevel
        var h = imgMetadata.height / Math.pow(2, viewerLevel);
	    var imageSize = this.size.clone();
        var tiles = new OpenLayers.Size(
            Math.ceil( imageSize.w / this.standardTileSize ),
            Math.ceil( imageSize.h / this.standardTileSize )
            );
	    
        this.resolutions = [1];
	    this.tierSizeInTiles = [tiles];
	    this.tierImageSize = [imageSize];

        for (i = 1; i <= viewerLevel; i++) {
	      var div = Math.pow(2, i);
	      var imageSize = new OpenLayers.Size(
	        Math.floor( this.size.w / div ),
	        Math.floor( this.size.h / div )
	      );
	      var tiles = new OpenLayers.Size(
            Math.ceil( imageSize.w / this.standardTileSize ),
            Math.ceil( imageSize.h / this.standardTileSize )
          );
          this.resolutions.unshift(div);
          this.tierSizeInTiles.unshift(tiles);
          this.tierImageSize.unshift( imageSize );
        }
 
        this.serverResolutions = this.resolutions;
        this.numberOfTiers = this.tierSizeInTiles.length;
        this.imageSize = this.tierImageSize[viewerLevel];
    },

    /**
     * APIMethod:destroy
     */
    destroy: function() {
        // for now, nothing special to do here. 
        OpenLayers.Layer.Grid.prototype.destroy.apply(this, arguments);  
    },

    
    /**
     * APIMethod: clone
     * 
     * Parameters:
     * obj - {Object}
     * 
     * Returns:
     * {<OpenLayers.Layer.OpenURL>} An exact clone of this <OpenLayers.Layer.OpenURL>
     */
    clone: function (obj) {
        
        if (obj == null) {
            obj = new OpenLayers.Layer.Djatoka(this.name,
                                           this.url,
                                           this.options);
        }

        //get all additions from superclasses
        obj = OpenLayers.Layer.Grid.prototype.clone.apply(this, [obj]);

        // copy/set any non-init, non-simple values here

        return obj;
    },    
    
    /**
     * Method: getURL
     * 
     * Parameters:
     * bounds - {<OpenLayers.Bounds>}
     * 
     * Returns:
     * {String} A string with the layer's url and parameters and also the 
     *          passed-in bounds and appropriate tile size specified as 
     *          parameters
     */
    getURL: function (bounds) {  
        bounds = this.adjustBounds(bounds);
        var res = this.getServerResolution();
        var x = Math.round((bounds.left - this.tileOrigin.lon) / (res * this.tileSize.w));
        var y = Math.round((this.tileOrigin.lat - bounds.top) / (res * this.tileSize.h));
        var z = this.getServerZoom( ) + this.zoomOffset;
        console.log("z: " + z);
        console.log( "this.map.getZoom(): " + this.map.getZoom());
        var imageSize = this.tierImageSize[z];
        console.dir(imageSize);
        var path = this.djatokaURL + "?url_ver=" + this.url_ver + "&rft_id=" + this.rft_id +
            "&svc_id=" + this.svc_id + "&svc_val_fmt=" + this.svc_val_fmt + "&svc.format=" + 
            this.format + "&svc.level=" + z + "&svc.rotate=0&svc.region=" + y + "," + 
            x + "," + imageSize.h + "," + imageSize.w;
        var url = this.url;
        if (OpenLayers.Util.isArray(url)) {
            url = this.selectUrl(path, url);
        }
        return url + path;
    },

    /** 
     * APIMethod: setMap
     * When the layer is added to a map, then we can fetch our origin 
     *    (if we don't have one.) 
     * 
     * Parameters:
     * map - {<OpenLayers.Map>}
     */
    setMap: function(map) {
        console.dir(map);
        OpenLayers.Layer.Grid.prototype.setMap.apply(this, arguments);
        this.tileOrigin = new OpenLayers.LonLat(this.map.maxExtent.left,
                                                this.map.maxExtent.top);
    },
    
    /**
     * Method: getImageSize
     * getImageSize returns size for a particular tile. If bounds are given as
     * first argument, size is calculated (bottom-right tiles are non square).
     *
     */
    getImageSize: function() {
        if (arguments.length > 0) {
            var bounds = this.adjustBounds(arguments[0]);
            var res = this.getServerResolution();
            var x = Math.round((bounds.left - this.tileOrigin.lon) / (res * this.tileSize.w));
            var y = Math.round((this.tileOrigin.lat - bounds.top) / (res * this.tileSize.h));
            var z = this.getZoomForResolution( res );
            var w = this.standardTileSize;
            var h = this.standardTileSize;
            if (x == this.tierSizeInTiles[z].w -1 ) {
                var w = this.tierImageSize[z].w % this.standardTileSize;
            }
            if (y == this.tierSizeInTiles[z].h -1 ) {
                var h = this.tierImageSize[z].h % this.standardTileSize;
            }
            return (new OpenLayers.Size(w, h));
        } else {
            return this.tileSize;
        }
    },
        
    getResolutions: function() {
      return this.serverResolutions;
    },
    
    getTileSize: function() {
      return this.tileSize;
    },

    getMinLevel: function(imgMetadata) {
        // Versions of djatoka from before 4/17/09 have levels set to the 
        // number of levels encoded in the image.  After this date, that 
        // number is assigned to the new dwtLevels, and levels contains the
        // number of levels between the full image size and the minimum 
        // size djatoka could return.  We want the lesser of these two numbers.

        var levelsInImg;
        var levelsToDjatokaMin;
        if (imgMetadata.dwtLevels === undefined) {
            var maxImgDimension = Math.max(imgMetadata.width, 
                                           imgMetadata.height);
            levelsInImg = imgMetadata.levels;
            levelsToDjatokaMin = Math.floor((Math.log(maxImgDimension) - 
                Math.log(OpenLayers.Layer.Djatoka.minDjatokaLevelDimension)) / 
                Math.log(2));
        } else {
            var levelsInImg = imgMetadata.dwtLevels;
            var levelsToDjatokaMin = imgMetadata.levels;
        }
        return Math.min(levelsInImg, levelsToDjatokaMin);
    },

    /**
     * Method: calculateGridLayout
     * Generate parameters for the grid layout. This
     *
     * Parameters:
     * bounds - {<OpenLayers.Bound>}
     * origin - {<OpenLayers.LonLat>}
     * resolution - {Number}
     *
     * Returns:
     * {Object} Object containing properties tilelon, tilelat, tileoffsetlat,
     * tileoffsetlat, tileoffsetx, tileoffsety
     */
    calculateGridLayout: function(bounds, origin, resolution) {
        var tilelon = resolution * this.tileSize.w;
        var tilelat = resolution * this.tileSize.h;

        var offsetlon = bounds.left - origin.lon;
        var tilecol = Math.floor(offsetlon/tilelon) - this.buffer;
        var tilecolremain = offsetlon/tilelon - tilecol;
        var tileoffsetx = -tilecolremain * this.tileSize.w;
        var tileoffsetlon = origin.lon + tilecol * tilelon;

        var offsetlat = origin.lat - bounds.top + tilelat;
        var tilerow = Math.floor(offsetlat/tilelat) - this.buffer;
        var tilerowremain = tilerow - offsetlat/tilelat;
        var tileoffsety = tilerowremain * this.tileSize.h;
        var tileoffsetlat = origin.lat - tilelat*tilerow;

        return {
          tilelon: tilelon, tilelat: tilelat,
          tileoffsetlon: tileoffsetlon, tileoffsetlat: tileoffsetlat,
          tileoffsetx: tileoffsetx, tileoffsety: tileoffsety
        };
    },
    CLASS_NAME: "OpenLayers.Layer.Djatoka"
});