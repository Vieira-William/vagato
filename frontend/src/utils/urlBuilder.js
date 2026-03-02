/**
 * Utilitário para construção dinâmica de URLs de busca
 * Suporta: LinkedIn Jobs, LinkedIn Posts e Indeed Brasil
 */

export const urlBuilder = {
    /**
     * Constrói URL do LinkedIn Jobs
     */
    buildLinkedInJobs: (filters) => {
        const { keywords, location, remote, level, jobType, timeRange, sortBy, easyApply, under10, industry, func, company } = filters;
        let url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keywords)}`;

        if (location) url += `&location=${encodeURIComponent(location)}`;

        // sortBy (R para Relevância, DD para Recência)
        const effectiveSortBy = sortBy || 'R';
        if (effectiveSortBy === 'DD') url += '&sortBy=DD';
        else url += '&sortBy=R';

        // Data (f_TPR)
        if (timeRange === '24h') url += '&f_TPR=r86400';
        else if (timeRange === 'week') url += '&f_TPR=r604800';
        else if (timeRange === 'month') url += '&f_TPR=r2592000';

        // Nível (1=Intern, 2=Junior, 3=Associate, 4=Senior, 5=Director, 6=Executive)
        if (level && level !== 'all') {
            const levelMap = { 'intern': 1, 'junior': 2, 'assistant': 2, 'mid-senior': 4, 'director': 5, 'executive': 6 };
            if (levelMap[level]) url += `&f_E=${levelMap[level]}`;
        }

        // Tipo de Vaga (f_JT)
        if (jobType && jobType !== 'all') {
            const jtMap = { 'full-time': 'F', 'contract': 'C', 'part-time': 'P', 'temporary': 'T', 'internship': 'I' };
            if (jtMap[jobType]) url += `&f_JT=${jtMap[jtType]}`;
        }

        // Modalidade (1=Presencial, 2=Remoto, 3=Híbrido)
        if (remote && remote !== 'all') {
            const remoteMap = { 'on-site': 1, 'remote': 2, 'hybrid': 3 };
            if (remoteMap[remote]) url += `&f_WT=${remoteMap[remote]}`;
        }

        if (easyApply) url += '&f_AL=true';
        if (under10) url += '&f_EA=true';
        if (industry) url += `&f_I=${encodeURIComponent(industry)}`;
        if (func) url += `&f_F=${encodeURIComponent(func)}`;
        if (company) url += `&f_C=${encodeURIComponent(company)}`;

        return url;
    },

    /**
     * Constrói URL do LinkedIn Posts
     */
    buildLinkedInPosts: (filters) => {
        const { keywords, timeRange, sortBy } = filters;
        const enhancedKeywords = `${keywords} "vaga" OR "hiring" OR "contratando"`;
        let url = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(enhancedKeywords)}`;

        if (timeRange === '24h') url += '&datePosted=%22past-24h%22';
        else if (timeRange === 'week') url += '&datePosted=%22past-week%22';
        else if (timeRange === 'month') url += '&datePosted=%22past-month%22';

        const effectiveSortBy = sortBy || 'DD';
        url += `&sortBy=%22${effectiveSortBy === 'DD' ? 'date_posted' : 'relevance'}%22`;
        return url;
    },

    /**
     * Constrói URL do Indeed Brasil com filtros complexos (sc)
     */
    buildIndeed: (filters) => {
        const { keywords, location, timeRange, salary, remote, jobType, education, lang } = filters;
        let url = `https://br.indeed.com/jobs?q=${encodeURIComponent(keywords)}`;

        if (location) url += `&l=${encodeURIComponent(location)}`;
        if (timeRange && timeRange !== 'all') {
            const days = { '24h': 1, 'week': 7, 'month': 30 };
            if (days[timeRange]) url += `&fromage=${days[timeRange]}`;
        }

        if (salary) url += `&salaryType=${encodeURIComponent(salary)}`;

        // Construção do parâmetro complexo sc (attr)
        let scAttrs = [];
        if (remote === 'remote') scAttrs.push('attr(DSQF7)');
        if (remote === 'hybrid') scAttrs.push('attr(65U66)');
        if (jobType === 'clt') scAttrs.push('attr(D7S5X)');
        if (jobType === 'internship') scAttrs.push('attr(VDTG7)');
        if (education === 'grad') scAttrs.push('attr(HFDVW)');

        if (scAttrs.length > 0) {
            url += `&sc=0kf%3A${scAttrs.join('')}%3B`;
        }

        if (lang) url += `&lang=${lang}`;

        url += '&sort=date';
        return url;
    }
};
