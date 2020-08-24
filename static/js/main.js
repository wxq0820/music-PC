$(function () {
    var EventCenter = {
        on: function (type, handler) {
            $(document).on(type, handler)
        },
        fire: function (type, data) {
            $(document).trigger(type, data)
        }
    }

    var footer = {
        init: function () {
            this.$classBox = $('.class-box')
            this.$classies = this.$classBox.find('.classies')
            this.$box = $('.box')
            this.$item = $('.classies li')
            this.isAnimate = false

            this.bind()
        },
        bind: function () {
            this.getData()

            var that = this
            
            $('.right').on('click', function () {
                var moveCount = Math.floor(that.$box.width() / $('.classies li').outerWidth(true))
                var move = moveCount * ($('.classies li').outerWidth(true))
                if (that.isAnimate) return
                that.isAnimate = true
                var moveLeft = parseFloat(that.$classies.css('left')) - move
                if (Math.abs(parseFloat(that.$classies.css('left'))) + parseFloat(that.$box.width()) > that.$classies.width()) {
                    moveLeft = 0
                }
                that.$classies.animate({
                    left: moveLeft
                }, 400, function () {
                    that.isAnimate = false
                })
            })

            $('.left').on('click', function () {
                var moveCount = Math.floor(that.$box.width() / $('.classies li').outerWidth(true))
                var move = moveCount * ($('.classies li').outerWidth(true))
                
                if (that.isAnimate) return
                that.isAnimate = true
                var left = parseFloat(that.$classies.css('left'))
                var moveRight = parseFloat(that.$classies.css('left')) + move
                if ((left + move) > 0) {
                    moveRight = 0
                }
                that.$classies.animate({
                    left: moveRight
                }, 400, function () {
                    that.isAnimate = false
                })
            })

            $('footer').on('click', 'li', function () {
                $(this).addClass('choose')
                    .siblings().removeClass('choose')
                $('.state').addClass('icon-pause').removeClass('icon-play')
                EventCenter.fire('select-album', {
                    album_id: $(this).attr('data-classies-id'),
                    album_name: $(this).attr('data-classies-name')
                })
            })
        },
        getData: function () {
            var that = this
            $.ajax({
                url: 'https://jirenguapi.applinzi.com/fm/v2/getChannels.php',
                dataType: 'jsonp',
                method: 'GET'
            }).done(function (ret) {
                console.log(ret)
                ret.channels.unshift({
                    channel_id: 0,
                    name: '我的最爱',
                    cover_small: 'http://cloud.hunger-valley.com/17-10-24/1906806.jpg-small',
                    cover_middle: 'http://cloud.hunger-valley.com/17-10-24/1906806.jpg-middle',
                    cover_big: 'http://cloud.hunger-valley.com/17-10-24/1906806.jpg-big',
                })
                ret.channels.forEach(function (data) {
                    that.$classies.append(that.createNode(data))
                })
                $('.classies li:first-child').addClass('choose')
                console.log($('.classies li:first-child').attr('data-classies-name'))
                EventCenter.fire('select-album', {
                    album_id: $('.classies li:first-child').attr('data-classies-id'),
                    album_name: $('.classies li:first-child').attr('data-classies-name')
                })
            })
        },
        createNode: function (data) {
            var $node = $(`<li data-classies-name=` + data.name + ` data-classies-id=` + data.channel_id + `>
                            <div class="classies-cover"></div>
                            <h3 class="classies-name">`+ data.name + `</h3>
                       </li>`)
            $node.find('.classies-cover').css('background', 'url(' + data.cover_big + ') center no-repeat')
            $node.find('.classies-cover').css('background-size', 'cover')
            return $node
        }
    }

    var app = {
        init: function () {
            this.album_id = '0'
            this.album_name = '我的最爱'
            this.audio = new Audio()
            this.audio.autoplay = true
            this.isPlaying = null
            this.currentSong = null
            this.lyric = null
            this.collect = this.loadFromLoad()

            this.bind()
        },
        bind: function () {
            var that = this
            EventCenter.on('select-album', function (e, channel) {
                that.album_id = channel.album_id
                that.album_name = channel.album_name
                console.log(that.collect)
                that.getData()
            })

            $('.state').on('click', function () {
                if ($(this).hasClass('icon-play')) {
                    $(this).addClass('icon-pause').removeClass('icon-play')
                    that.audio.play()
                } else {
                    $(this).addClass('icon-play').removeClass('icon-pause')
                    that.audio.pause()
                }
            })
            $('.next').on('click', function () {
                $('.state').addClass('icon-pause').removeClass('icon-play')
                console.log('next..')
                that.getData()
            })
            $('.favo').on('click', function () {
                if ($(this).hasClass('choose')) {
                    $(this).removeClass('choose')
                    delete that.collect[that.currentSong.sid]
                } else {
                    $(this).addClass('choose')
                    that.collect[that.currentSong.sid] = that.currentSong
                }
                that.saveToLocal()
            })
            this.audio.addEventListener('play', function () {
                $('.state').addClass('icon-pause').removeClass('icon-play')
                $('.progress-bar').on('click', function (e) {
                    console.log(e.offsetX)
                    $('.progress').css('width', e.offsetX)
                    that.audio.currentTime = (e.offsetX / $('.progress-bar').width()) * that.audio.duration
                })
                that.isPlaying = setInterval(function () {
                    that.progress()
                    that.showLyric()
                }, 1000)
            })
            this.audio.addEventListener('pause', function () {
                clearInterval(that.isPlaying)
            })
            this.audio.addEventListener('ended', function () {
                clearInterval(that.isPlaying)
                $('.state').addClass('icon-play').removeClass('icon-pause')
                that.getData()
            })
        },
        getData: function () {
            var that = this
            if (this.album_id == '0') {
                if (Object.keys(that.collect).length === 0) {
                    console.log('暂时无歌曲标记为喜爱')
                    return
                }
                that.play(that.loadCollect())
                $('.favo').addClass('choose')
            } else {
                $.ajax({
                    url: 'https://jirenguapi.applinzi.com/fm/v2/getSong.php',
                    dataType: 'jsonp',
                    method: 'GET',
                    data: {
                        channel: this.album_id
                    }
                }).done(function (ret) {
                    console.log(ret.song)
                    if (ret.song[0]) {
                        that.play(ret.song[0])
                        if (that.collect[that.currentSong.sid]) {
                            $('.favo').addClass('choose')
                        } else {
                            $('.favo').removeClass('choose')
                        }
                    } else {
                        console.log('未加载到歌曲信息。。。')
                    }
                })
            }
        },
        play: function (song) {
            this.currentSong = song
            this.audio.src = song.url

            $('.progress').css('width', 0)

            $('.tips').text(this.album_name)
            $('.song').text(song.title)
            $('.singer').text(song.artist)
            $('.picture').css('background', 'url(' + song.picture + ') center no-repeat')
            $('.bg').css('background', 'url(' + song.picture + ') center no-repeat')
            $('.bg').css('background-size', 'cover')
            this.loadLyric()
        },
        progress: function () {
            var totalTime = this.audio.duration
            var currentTime = this.audio.currentTime
            var minute = Math.floor(currentTime / 60)
            var second = Math.floor(currentTime % 60)
            second = second < 10 ? '0' + second : second
            minute = minute < 10 ? '0' + minute : minute
            var time = minute + ':' + second
            $('.time').text(time)
            var width = (currentTime / totalTime) * 100 + '%'
            $('.progress').animate({ width: width }, 300, 'linear', function () {
            })
        },
        saveToLocal: function () {
            localStorage['collection'] = JSON.stringify(this.collect)
        },
        loadFromLoad: function () {
            return JSON.parse(localStorage['collection'] || '{}')
        },
        loadCollect: function () {
            var that = this
            var keyArr = Object.keys(this.collect);
            if (keyArr.length === 0) return;
            var index = Math.floor(Math.random() * keyArr.length)
            var randomSid = keyArr[index];
            return that.collect[randomSid]
        },
        loadLyric: function () {
            var that = this
            $.ajax({
                url: 'https://jirenguapi.applinzi.com/fm/v2/getLyric.php',
                dataType: 'json',
                method: 'POST',
                data: {
                    sid: that.currentSong.sid,
                    ssid: that.currentSong.ssid
                }
            }).done(function (ret) {
                console.log(ret.lyric)
                that.setLyric(ret.lyric)
            }).fail(function () {
                console.log('加载歌词失败。。')
            })
        },
        setLyric: function (lyric) {
            var lyricObj = {}
            lyric.split('\n').forEach(function (line) {
                var times = line.match(/\d{2}:\d{2}/g)
                if (times) {
                    times.forEach(function (time) {
                        lyricObj[time] = line.replace(/\[.+?\]/g, '')
                    })
                }
            })
            this.lyric = lyricObj
            console.log(this.lyric)
        },
        showLyric: function () {
            var that = this
            var time = '0' + Math.round(this.audio.currentTime / 60) + ':'
                + (Math.floor(this.audio.currentTime) % 60 / 100).toFixed(2).substr(2)
            if (that.lyric && that.lyric[time]) {
                $('.lyric').text(that.lyric[time])
            }
        }
    }

    footer.init()
    app.init()

})