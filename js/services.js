'use strict';

var ThreeMServices = angular.module('ThreeMServices', []);



/* Services */

ThreeMServices.service('moduleService', function($http, $q) {
    var currentPage;
    var quizPages;
    var skipToQuiz;
    var answers;
    var totalPages;

    function start() {

        var manifest = $http.get('/manifest.json', {cache: false});
        var progress = $http.get('/progress.json', {cache: false});
        var deferred = $q.defer();

        $q.all([manifest, progress])
            .then(function(res) {
                var manifestData = res[0].data;
                var progressData = res[1].data;
                totalPages = manifestData.pages;
                quizPages = manifestData.quiz_pages;
                currentPage = typeof progressData.page !== 'undefined' ? progressData.page : 0;
                answers = typeof progressData.answers !== 'undefined' ? progressData.answers : {};
                skipToQuiz = typeof progressData.skipToQuiz !== 'undefined' ? progressData.skipToQuiz : false;

                deferred.resolve();
            });

        return deferred.promise;
    }

    function getCurrentPage() {
        return currentPage;
    }

    function getTotalPages() {
        return totalPages;
    }

    function getQuizPages() {
        return quizPages;
    }

    function getQuizPageCount() {
        return Object.keys(quizPages).length;
    }

    function getAnswers() {
        return answers;
    }

    function skipToQuiz() {
        return skipToQuiz;
    }

    return({
        start: start,
        getCurrentPage: getCurrentPage,
        getTotalPages: getTotalPages,
        getQuizPages: getQuizPages,
        getQuizPageCount: getQuizPageCount,
        getAnswers: getAnswers,
        skipToQuiz: skipToQuiz
    });
});

ThreeMServices.service('notificationService', function() {
    return({
        moduleStarted: moduleStarted,
        moduleProgress: moduleProgress,
        moduleCorrect: moduleCorrect,
        moduleIncorrect: moduleIncorrect,
        moduleAnswer: moduleAnswer,
        moduleFinished: moduleFinished
    });

    function moduleStarted(pages) {
        var url = 'hacallback:///started?pages=' + pages;
        triggerUrl(url);
    }

    function moduleProgress(page) {
        var url = 'hacallback:///progress?page=' + page;
        triggerUrl(url);
    }

    function moduleAnswer(page, answers) {
        var url = 'hacallback:///answer?page=' + page + '&answers=' + answers.join(",");
        triggerUrl(url);
    }

    function moduleCorrect() {
        var url = 'hacallback:///correct';
        triggerUrl(url);
    }

    function moduleIncorrect() {
        var url = 'hacallback:///incorrect';
        triggerUrl(url);
    }

    function moduleFinished(score) {
        var url = 'hacallback:///finished?score=' + score;
        triggerUrl(url);
    }

    function triggerUrl(url) {
        var iframe = document.createElement('iframe');
        iframe.setAttribute("src", url);
        document.documentElement.appendChild(iframe);
        iframe.parentNode.removeChild(iframe);
        iframe = null;
    }
});


ThreeMServices.service('quizService', ['moduleService', 'notificationService', function(moduleService, notificationService) {

    var userAnswers = {};

    function getAnswers(page) {
        return userAnswers[page] ? userAnswers[page].answers : [];
    }

    function setUserAnswers(newUserAnswers) {
        userAnswers = newUserAnswers;
    }

    function getPageAnswers(page) {
        if ((typeof userAnswers !== 'undefined') && (typeof userAnswers[page] !== 'undefined')) {
            return userAnswers[page].answers;
        }

        return [];
    }

    function isQuizPage(page) {
        for (var pageIndex in moduleService.getQuizPages()) {
            if (page == pageIndex) {
                return true;
            }
        }

        return false;
    }

    function isPageCorrect(page) {
        var quizPages = moduleService.getQuizPages();
        return angular.equals(quizPages[page].answers, getPageAnswers(page))
    }

    function getQuizScore() {
        var score = 0;
        var quizPages = moduleService.getQuizPages();

        if (angular.equals(quizPages, {})) {
            return 100;
        }

        for (var page in quizPages) {
            if (isPageCorrect(page)) {
                score += 1;
            }
        }

        var size = 0, key;
        for (key in quizPages) {
            if (quizPages.hasOwnProperty(key)) size += 1;
        }

        return Math.ceil((score / size) * 100);
    }

    function recordAnswers(page, answers) {
        var pageAnswer = userAnswers[page];

        if (!pageAnswer) {
            pageAnswer = {
                "page": page
            };
        }

        pageAnswer.answers = answers;
        userAnswers[page] = pageAnswer;
        notificationService.moduleAnswer(page, pageAnswer.answers);
    }

    function submitAnswers(page) {
        var quizPage = moduleService.getQuizPages()[page];
        if ((typeof userAnswers !== 'undefined') && (typeof userAnswers[page] !== 'undefined')) {
            if (angular.equals(userAnswers[page].answers, quizPage.answers)) {
                notificationService.moduleCorrect();
            } else {
                notificationService.moduleIncorrect();
            }
        }
    }

    return({
        recordAnswers: recordAnswers,
        submitAnswers: submitAnswers,
        getAnswers: getAnswers,
        getPageAnswers: getPageAnswers,
        setUserAnswers: setUserAnswers,
        isPageCorrect: isPageCorrect,
        isQuizPage: isQuizPage,
        getQuizScore: getQuizScore
    });
}]);


ThreeMServices.service('navigationService', ['moduleService', 'notificationService', 'quizService', function(moduleService, notificationService, quizService) {

    var pageStack = [];
    var finalPage = false;
    var CORRECT = "-correct";
    var INCORRECT = "-incorrect";
    var INTRO = "-intro";
//    var CORRECT_FINAL = '-correct-final'

    function updateTemplate(page, skipQuiz, decisionTreePage) {

        var template;
        if (!skipQuiz && quizService.isQuizPage(page - 1) && decisionTreePage == false) {
            if (quizService.isPageCorrect(page - 1)) {
                if (page == 0) {
                    template = this.getTemplate(INTRO);
                } else {
                    template = this.getTemplate(CORRECT);
                }
            } else {
                template = this.getTemplate(INCORRECT);
            }
        } else {
            template = this.getTemplate(page);
        }

        return template;
    }

    function getDecisionTreePage(page)
    {
        var answers = quizService.getPageAnswers($scope.page);
        angular.forEach(answers, function(value, key) {
            if(value === true) {
                var divNumber = key + 1;
                var pageElement = '.question' + divNumber; //change here
                return angular.element(pageElement).data( "go-to" );
            }
        });

        return page++; //should never run here unless no answer selected - that should be handled by the app
    }

    function getTemplate(page)
    {
        return "/page/page" + page + ".html";
    }

    function startModules(page)
    {
        var template;
        if (page > 0) {
            //user is skipping to the quiz
            pageStack.push(page);
            template = this.getTemplate(page);
        } else {
            template = this.getTemplate(INTRO);
        }
        return template;
    }

    function start()
    {
        pageStack.push(INTRO);
    }

    function isLastPage(page){

        if (page == moduleService.getTotalPages()) {
            return true;
        }

        return false;
    }

    function previous(page)
    {
        if (pageStack.length == 0) {
            //may happen if user is just doing questions and not full module there may not be an old page to go back to
            return page;
        }
        var prevPage = pageStack.pop();
        return prevPage;
    }

    function newNextPage(answerPage, page, quizPage, correct, decisionTreePage)
    {
        //decision tree
        if (decisionTreePage !== false) {
            pageStack.push(page);
            return decisionTreePage;
        }

        //page 0 is intro page
        if (page == 0) {
            pageStack.push(INTRO);
            return 1;
        }

        //quiz page - only send quiz page if it's a question
        if (quizPage === true) {
            if(correct === true) {
                    pageStack.push(page);
                    return CORRECT;
            } else {
                pageStack.push(page);
                return page + INCORRECT;
            }
        }

        //leaving answer page
        if (answerPage === true) {
            pageStack.push(page);
            var previousQuestionPage =  pageStack[pageStack.length - 2];
            return previousQuestionPage + 1
        }

        //leaving standard page
        pageStack.push(page);
        return page + 1;
    }

    function getButtonText(page, movingForward)
    {
        //if intro page - intro page starts as page 0 but the page stack pops back '-intro' so it is possible to reload the page
        if (page == 0 || page == INTRO) {
            return 'Get Started';
        }

        // final page if last quiz page has been passed, user navigated forward and the page is a correct or incorrect page
        if(finalPage === true && movingForward === true) {
            var pageIsCorrect = page.indexOf("correct");
            var pageIsIncorrect = page.indexOf("incorrect");
            if (pageIsCorrect > -1 || pageIsIncorrect > -1) {
                return 'Finish';
            }
        }

        if (quizService.isQuizPage(page) === true) {

            //set final page to true so that the next correct or incorrect page moving forwards displays finish
            if (page == moduleService.getTotalPages()) {
                finalPage = true;
            }
        } else {

            //last page may not necessarily get a quiz page
            if(page == moduleService.getTotalPages()) {
                return 'Finish';
            }
        }

        return 'Next';
    }


    return({
        getDecisionTreePage: getDecisionTreePage,
        newNextPage : newNextPage,
        updateTemplate: updateTemplate,
        startModules: startModules,
        getButtonText: getButtonText,
        isLastPage: isLastPage,
        getTemplate: getTemplate,
        start: start,
        previous: previous
    });
}]);
